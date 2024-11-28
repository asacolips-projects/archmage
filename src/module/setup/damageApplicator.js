import HitEvaluation from "../rolls/HitEvaluation.mjs";
import Targeting from '../rolls/Targeting.mjs';
import Triggers from '../Triggers/Triggers.mjs';

const REGEX_EXPANDED_INLINE_ROLL = /.*=\s(\d+)/gm;

export class DamageApplicator {

  getRollValue(roll) {
    if (Number.isInteger(roll)) {
      return roll;
    }
    if (roll instanceof Roll) {
      return roll.total;
    }
    // Try the regex for expanded rolls.
    let match = REGEX_EXPANDED_INLINE_ROLL.exec(roll[0].innerText);
    if (match) return Number.parseInt(match[1]);
    // Regex failed to match, try grabbing the inner text.
    match = Number.parseInt(roll[0].innerText.trim());
    return match || 0;  // Fallback if we failed to parse
  }

  getTargets(targetType) {
    const targets = targetType === 'targeted'
      ? [...game.user.targets]
      : (canvas?.tokens?.controlled ?? []);

    if (!targets || targets?.length < 1) {
      ui.notifications.warn(game.i18n.localize(`ARCHMAGE.UI.${targetType === 'targeted' ? 'noTarget' : 'noToken'}`));
      return [];
    }

    return targets;
  }

  asDamage(roll, modifier = 1, targetType = 'selected') {
    let toApply = this.getRollValue(roll);

    if (game.settings.get('archmage', 'roundUpDamageApplication')) {
      toApply = Math.ceil(toApply * modifier);
    }
    else {
      toApply = Math.floor(toApply * modifier);
    }

    const targets = this.getTargets(targetType);
    const mooks = targets.filter(t => t.actor.type === 'npc' && t.actor.system.details.role.value === 'mook');
    const needsMookDialog = mooks.find(t => toApply > (t.actor.system.attributes.hp.value + t.actor.system.attributes.hp.temp));

    const appliedTargets = needsMookDialog
      ? targets.filter(t => t.actor.type !== 'npc' || t.actor.system.details.role.value !== 'mook')
      : targets;

    // Apply damage if user is a GM.
    if (game.user.isGM || targetType === 'selected') {
      if (needsMookDialog) {
        const mookDialog = new game.archmage.MookDamageApplicationV2(mooks, toApply);
        mookDialog.render(true);
      }
      appliedTargets.forEach(token => {
        let actorData = foundry.utils.duplicate(token.actor);
        token.actor.update({
          "system.attributes.hp.value": actorData.system.attributes.hp.value - toApply,
        });
      });
    }
    // Otherwise, emit a socket so that a GM user can apply it.
    else {
      // @todo handle mooks here
      game.socket.emit('system.archmage', {
        type: 'applyDamageHealing',
        uuids: targets.map(t => t.document.uuid),
        attr: 'system.attributes.hp.value',
        operation: 'damage',
        value: toApply,
      });
    }
  }

  asHealing(roll, modifier = 1, targetType = 'selected') {
    let toApply = this.getRollValue(roll);

    if (game.settings.get('archmage', 'roundUpDamageApplication')) {
      toApply = Math.ceil(toApply * modifier);
    }
    else {
      toApply = Math.floor(toApply * modifier);
    }

    const targets = this.getTargets(targetType);
    // Apply damage if user is a GM.
    if (game.user.isGM || targetType === 'selected') {
      targets.forEach(token => {
        let actorData = foundry.utils.duplicate(token.actor);
        token.actor.update({
          "system.attributes.hp.value": Math.max(0, actorData.system.attributes.hp.value) + toApply,
        });
      });
    }
    // Otherwise, emit a socket so that a GM user can apply it.
    else {
      game.socket.emit('system.archmage', {
        type: 'applyDamageHealing',
        uuids: targets.map(t => t.document.uuid),
        attr: 'system.attributes.hp.value',
        operation: 'healing',
        value: toApply,
      });
    }
  }

  asTempHealth(roll, modifier = 1, targetType = 'selected') {
    let toApply = this.getRollValue(roll);
    if (game.settings.get('archmage', 'roundUpDamageApplication')) {
      toApply = Math.ceil(toApply * modifier);
    }
    else {
      toApply = Math.floor(toApply * modifier);
    }
    const targets = this.getTargets(targetType);
    // Apply damage if user is a GM.
    if (game.user.isGM || targetType === 'selected') {
      targets.forEach(token => {
        const hp = {...token.actor.system.attributes.hp};
        if (isNaN(hp.temp) || hp.temp === undefined) hp.temp = 0;
        hp.temp = Math.max(hp.temp, toApply);
        token.actor.update({
          "system.attributes.hp.temp": hp.temp,
        });
      });
    }
    // Otherwise, emit a socket so that a GM user can apply it.
    else {
      game.socket.emit('system.archmage', {
        type: 'applyDamageHealing',
        uuids: targets.map(t => t.document.uuid),
        attr: 'system.attributes.hp.temp',
        operation: 'tempHealing',
        value: toApply,
      });
    }
  }

  /**
   * Callback to reroll dice
   * 
   * If an inline dice roll or standard dice roll is passed into the callback,
   * this will reroll the dice, update the DOM, and then push out an update
   * to the message document for storage.
   * 
   * @param html jQuery object passed by the callback.
   */
  static async rerollDice(html) {
    const element = html[0];
    const rollRaw = element.dataset?.roll ?? false;
    // If there's a roll data prop, proceed.
    if (rollRaw) {
      const inlineroll = html;
      // Build a new copy of the roll.
      const roll = Roll.fromJSON(unescape(rollRaw));
      // Get the actor and message.
      const actorElement = element.closest('[data-actor-uuid]');
      const messageElement = element.closest('[data-message-id]');
      const actor = actorElement?.dataset?.actorUuid ? await fromUuid(actorElement.dataset.actorUuid) : false;
      const item = actor && actorElement.dataset?.itemId ? actor.items.get(actorElement.dataset.itemId) : false;
      const message = messageElement?.dataset?.messageId ? game.messages.get(messageElement.dataset.messageId) : false;
      const rowElement = inlineroll.parent('.card-prop');
      const rowText = rowElement?.text() ?? '';

      // Only proceed if those were valid.
      if (actor && message) {
        // Reroll and store.
        const rollData = actor.getRollData();
        roll.data = rollData;
        const newRoll = await roll.reroll();
        // Show Dice So Nice roll.
        if (game.dice3d) {
          const chatData = {
            whisper: message.whisper,
            blind: message.blind,
            speaker: message.speaker,
          };
          await game.archmage.ArchmageUtility.show3DDiceForRoll(newRoll, chatData, messageElement.dataset.messageId)
        }
        // Apply changes to the DOM.
        const rollContent = element.innerHTML.replace(/(<\/i>)(\s*)(\d+)/g, (full, p1, p2, p3) => `${p1}${p2}${newRoll.total}`);
        element.dataset.roll = escape(JSON.stringify(newRoll.toJSON()));
        element.innerHTML = rollContent;
        // Re-evaluate styling for attack lines.
        if (rowText.startsWith(`${game.i18n.localize("ARCHMAGE.CHAT.target")}:`)
          || rowText.startsWith(`${game.i18n.localize("ARCHMAGE.CHAT.attack")}:`)) {
          // Remove existing crit/fail classes.
          element.classList.remove('dc-crit');
          element.classList.remove('dc-fail');
          element.classList.remove('dc-reroll');
          // @todo handle actual targets and crit range modifications.
          const targetOptions = {
            numTargets: message?.flags?.archmage?.numTargets ?? 0,
            cachedTargets: message?.flags?.archmage?.targets ?? [],
          };
          const $attackRow = $(element.closest('.card-prop'));
          const targets = Targeting.getTargetsFromRowText(rowText, $attackRow, targetOptions.numTargets, targetOptions.cachedTargets);
          let addEdToCritRange = false;
          let addStokeToCritRange = false;
          if (game.settings.get('archmage', 'secondEdition') && item) {
            addEdToCritRange = item.system.breathWeapon?.value?.length > 0;
            if (actor.system.details?.type?.value === 'dragon') {
              const breathString = game.i18n.localize('ARCHMAGE.CHAT.breath').toLocaleLowerCase().trim();
              if (item.name.toLocaleLowerCase().includes(breathString)) {
                  addStokeToCritRange = true;
              }
          }
          }
          const hitEvaluationResults = HitEvaluation.processRowText(rowText, targets, $attackRow, actor, addEdToCritRange, addStokeToCritRange);

          if (hitEvaluationResults.defenses.length > 0) {
            // @todo Re-evaluate rolls here.
            const rows = element.closest('.card-row').querySelectorAll('.card-prop');
            rows.forEach((rowSelf) => {
              let $rowSelf = $(rowSelf);
              let rowSelfText = $rowSelf.html();
              const rowCleanText = $rowSelf.text();

              // Remove existing targets.
              $rowSelf.find('.dc-target')?.remove();

              // Append hit targets to text
              if (rowCleanText.startsWith(game.i18n.localize("ARCHMAGE.CHAT.hit") + ':') && hitEvaluationResults.targetsHit.length > 0) {
                $rowSelf.find('strong').after("<span class='dc-target'> (" + HitEvaluation.getNames(
                  hitEvaluationResults.targetsHit,
                  hitEvaluationResults.targetsCrit) + ") </span>")
              }
              // Append missed targets to text
              if (rowCleanText.startsWith(game.i18n.localize("ARCHMAGE.CHAT.miss") + ':') && hitEvaluationResults.targetsMissed.length > 0) {
                $rowSelf.find('strong').after("<span class='dc-target'> (" + HitEvaluation.getNames(
                  hitEvaluationResults.targetsMissed,
                  hitEvaluationResults.targetsFumbled) + ") </span>")
              }
              // Append target defenses to text
              if (rowCleanText.startsWith(game.i18n.localize("ARCHMAGE.CHAT.attack") + ':') && hitEvaluationResults.defenses.length > 0
                && game.settings.get("archmage", "showDefensesInChat")) {
                $rowSelf.append("<span class='dc-target'> (" + hitEvaluationResults.defenses.join(", ") + ") </span>")
              }

              let triggerText = rowSelfText.toLowerCase();
              if (triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.natural").toLowerCase()) ||
                triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.miss").toLowerCase() + ':') ||
                triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.hit").toLowerCase() + ':') ||
                triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.crit").toLowerCase() + ':') ||
                triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.hitEven").toLowerCase() + ':') ||
                triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.hitOdd").toLowerCase() + ':')) {
                let triggers = new Triggers();
                let active = triggers.evaluateRow(rowSelfText, hitEvaluationResults.$rolls, hitEvaluationResults);

                // Remove previous classes.
                $rowSelf.removeClass('trigger-unknown')
                  .removeClass('trigger-active')
                  .removeClass('trigger-miss')
                  .removeClass('trigger-inactive');

                if (active == undefined) {
                  $rowSelf.addClass("trigger-unknown");
                } else if (active) {
                  $rowSelf.addClass("trigger-active");
                  if (triggerText.includes(game.i18n.localize("ARCHMAGE.CHAT.miss").toLowerCase() + ':')) {
                    $rowSelf.addClass("trigger-miss");
                  }
                } else {
                  $rowSelf.addClass("trigger-inactive");
                  if (game.settings.get("archmage", "hideInsteadOfOpaque")) {
                    $rowSelf.addClass("hide");
                  }
                }
              }
            });
          }
        }
        // Force the context closed since we just manipulated the DOM.
        if (ui.context) {
          ui.context.close();
        }
        // Add a short timeout to allow the DOM to update before updating the message document.
        setTimeout(() => {
          const contentElement = element.closest('[data-actor-uuid]');
          if (contentElement) {
            message.update({content: contentElement.outerHTML});
          }
        }, 250);
      }
    }
    // Otherwise, handle general purpose rolls.
    else {
      const rollFormula = element.querySelector('.dice-formula')?.innerText ?? false;
      if (rollFormula) {
        const messageElement = element.closest('[data-message-id]');
        const message = messageElement?.dataset?.messageId ? game.messages.get(messageElement.dataset.messageId) : false;
        const newRoll = new Roll(rollFormula);
        await newRoll.evaluate();
        // Show Dice So Nice roll.
        if (game.dice3d) {
          const chatData = {
            whisper: message.whisper,
            blind: message.blind,
            speaker: message.speaker,
          };
          await game.archmage.ArchmageUtility.show3DDiceForRoll(newRoll, chatData, messageElement.dataset.messageId)
        }
        // Replace the roll contents of the chat message.
        const content = await newRoll.render();
        const contentElement = document.createElement('div');
        contentElement.innerHTML = content.trim();
        contentElement.querySelector('.dice-roll').classList.add('dice-roll--archmage');
        element.outerHTML = contentElement.innerHTML;
        // Force the context closed since we just manipulated the DOM.
        if (ui.context) {
          ui.context.close();
        }
        // Add a short timeout to allow the DOM to update before updating the message document.
        setTimeout(() => {
          const wrapperElement = messageElement.querySelector('.message-content');
          if (wrapperElement) {
            message.update({content: wrapperElement.innerHTML});
          }
        }, 250);
      }
    }
  }
}
