import ArchmageRolls from "../rolls/ArchmageRolls.mjs";
import { MacroUtils } from '../setup/utility-classes.js';
import preCreateChatMessageHandler from "../hooks/preCreateChatMessageHandler.mjs";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemArchmage extends Item {

  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.img || this.img == CONFIG.DEFAULT_TOKEN) {
      if (CONFIG.ARCHMAGE.defaultTokens[this.type]) {
        this.img = CONFIG.ARCHMAGE.defaultTokens[this.type];
      }
      else {
        this.img = CONST.DEFAULT_TOKEN;
      }
    }

    if (this.type == 'loot' || this.type == 'tool') {
      let model = game.system.model.Item[this.type];
      if (!this.system.quantity) this.system.quantity = model.quantity;
    }
  }

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll() {
    // Update uses left
    let uses = this.system.quantity?.value;
    if (uses == null) {
      return this._roll_resource_check({});
    } else {
      let updateData = {"system.quantity.value": Math.max(uses - 1, 0)};
      if (uses == 0 && !event.shiftKey && this.type == "power"
        && this.system.powerUsage.value != 'at-will') {
        let use = false;
        new Dialog({
          title: game.i18n.localize("ARCHMAGE.CHAT.NoUses"),
          content: game.i18n.localize("ARCHMAGE.CHAT.NoUsesMsg"),
          buttons: {
            use: {
              label: game.i18n.localize("ARCHMAGE.CHAT.Use"),
              callback: () => {use = true;}
            },
            cancel: {
              label: game.i18n.localize("ARCHMAGE.CHAT.Cancel"),
              callback: () => {}
            }
          },
          default: 'cancel',
          close: html => {
            if (use) {
              return this._roll_resource_check(updateData);
            }
          }
        }).render(true);
      } else {
        return this._roll_resource_check(updateData);
      }
    }
  }

  async _roll_resource_check(itemUpdateData) {
    // Decrease resources if cost is set
    let cost = this.system.cost?.value;
    let updateData = {}
    if (cost && game.settings.get("archmage", "automatePowerCost")) {
      let filter = /^(-*[0-9]*) ([a-zA-Z ]+)|([a-zA-Z ]+)$/;
      let parsed = filter.exec(cost);
      let res = this.actor.system.resources;
      if (parsed) {
        // Command points
        if (parsed[2] && parsed[2].toLowerCase().includes("command point")
            && res.perCombat.commandPoints.enabled) {
          let costNum = Number(parsed[1]);
          let path = 'system.resources.perCombat.commandPoints.current';
          updateData[path] = res.perCombat.commandPoints.current - costNum;
          if (costNum > res.perCombat.commandPoints.current) {
            let msg = game.i18n.localize("ARCHMAGE.UI.errNotEnoughCP");
            updateData[path] = 0;
            return this._roll_resDiag(msg, itemUpdateData, updateData);
          }
        }
        // Ki
        else if (parsed[2] && parsed[2].toLowerCase().includes("ki")
            && this.actor.system.resources.spendable.ki.enabled) {
          let costNum = Number(parsed[1]);
          let path = 'system.resources.spendable.ki.current';
          updateData[path] = res.spendable.ki.current - costNum;
          if (costNum > res.spendable.ki.current) {
            let msg = game.i18n.localize("ARCHMAGE.UI.errNotEnoughKi");
            updateData[path] = 0;
            return this._roll_resDiag(msg, itemUpdateData, updateData);
          }
        }
        // Momentum
        else if (parsed[3] && res.perCombat.momentum.enabled) {
          let path = 'system.resources.perCombat.momentum.current';
          if (parsed[3].toLowerCase() == "gain momentum") {
            updateData[path] = true;
          } else if (parsed[3].toLowerCase() == "spend momentum"
          || parsed[3].toLowerCase() == "have momentum") {
            if (!res.perCombat.momentum.current) {
              let msg = game.i18n.localize("ARCHMAGE.UI.errNoMomentum");
              return this._roll_resDiag(msg, itemUpdateData, updateData);
            } else {
              if (parsed[3].toLowerCase() == "spend momentum") {
                updateData[path] = false;
              }
            }
          }
        }
        // Focus
        else if (parsed[3] && res.perCombat.focus.enabled) {
          let path = 'system.resources.perCombat.focus.current';
          if (parsed[3].toLowerCase() == "gain focus") {
            updateData[path] = true;
          } else if (parsed[3].toLowerCase() == "focus") {
            if (!res.perCombat.focus.current) {
              let msg = game.i18n.localize("ARCHMAGE.UI.errNoFocus");
              return this._roll_resDiag(msg, itemUpdateData, updateData);
            } else {
              updateData[path] = false;
            }
          }
        }
        // Custom resources
        for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
          let resourcePathName = "custom"+idx;
          let resourceName = res.spendable[resourcePathName].label;
          if (res.spendable[resourcePathName].enabled && parsed[2] && parsed[1]
            && res.spendable[resourcePathName].current !== null
            && resourceName.toLowerCase().includes(parsed[2].toLowerCase())) {
            let numUsed = Number(parsed[1]);
            let path = `system.resources.spendable.${resourcePathName}.current`;
            updateData[path] = res.spendable[resourcePathName].current - numUsed;
            if (updateData[path] < 0) {
              let msg = game.i18n.localize("ARCHMAGE.UI.errNoCustomResource") + " ";
              msg += resourceName + ". " + game.i18n.localize("ARCHMAGE.UI.errNoCustomResource2");
              updateData[path] = 0;
              return this._roll_resDiag(msg, itemUpdateData, updateData);
            }
            let resMax = res.spendable[resourcePathName].max;
            if (resMax && updateData[path] > resMax) {
              updateData[path] = resMax;
            }
          }
        }
      }
    }
    return this._roll_render(itemUpdateData, updateData);
  }

  async _roll_resDiag(message, itemUpdateData, actorUpdateData) {
    let use = false;
    new Dialog({
      title: game.i18n.localize("ARCHMAGE.CHAT.NoResources"),
      content: message,
      buttons: {
        use: {
          label: game.i18n.localize("ARCHMAGE.CHAT.Use"),
          callback: () => {use = true;}
        },
        cancel: {
          label: game.i18n.localize("ARCHMAGE.CHAT.Cancel"),
          callback: () => {}
        }
      },
      default: 'cancel',
      close: html => {
        if (use) {
          return this._roll_render(itemUpdateData, actorUpdateData);
        } else {
          return;
        }
      }
    }).render(true);
  }

  async _roll_render(itemUpdateData, actorUpdateData) {
    // Replicate attack rolls as needed for attacks
    let overrideData = {};
    let numTargets = {targets: 1, rolls: []};
    if (this.type == "power" || this.type == "action") {
      let attackLine = ArchmageRolls.addAttackMod(this);
      overrideData = {"system.attack.value": attackLine};
      if (game.settings.get("archmage", "multiTargetAttackRolls")){
        numTargets = await ArchmageRolls.rollItemTargets(this);
        overrideData = {"system.attack.value": ArchmageRolls.rollItemAdjustAttacks(this, attackLine, numTargets)};
        if (numTargets.targetLine) overrideData["system.target.value"] = numTargets.targetLine;
      }
    }
    let itemToRender = this.clone(overrideData, {"save": false, "keepId": true});

    // Prepare roll data now
    let rollData = itemToRender.actor.getRollData(this);

    // Handle rollTable
    if (this.system.rollTable?.value) {
      // Load table from world first
      let table = game.tables.find(t => t.name === this.system.rollTable.value);
      if (!table) {
        // If not present in world, load system's from compendium
        let pack = await game.packs.get("archmage.system-rolltables").getDocuments();
        table = pack.find(t => t.name === this.system.rollTable.value);
      }
      if (table) {
        // If we do have a table, roll on it
        let roll = new Roll(table.formula, rollData);
        let res = await table.draw({roll: roll, displayChat: false});
        // Now override system.rollTable with rolled result
        try {
          itemToRender.system.rollTable.label = itemToRender.system.rollTable.value;
          itemToRender.system.rollTable.value = res.results[0].text;
        } catch(ex) {
          ui.notifications.error("Only text rollTables are supported for now");
        }
      }
    }

    // Basic template rendering data
    const template = `systems/archmage/templates/chat/${this.type.toLowerCase()}-card.html`
    let tokens = canvas.tokens.controlled;
    let token = tokens ? tokens[0] : null;
    if (!token || token.actor != itemToRender.actor) {
      tokens = itemToRender.actor.getActiveTokens(true);
      token = tokens.length > 0 ? tokens[0] : null;
    }
    const templateData = {
      actor: itemToRender.actor,
      tokenId: null, //token ? `${token.scene.id}.${token.id}` : null,
      item: itemToRender,
      data: itemToRender.getChatData({ rollData: rollData }, true)
    };

    // TODO: roll rolls here
    //let rollData = await ArchmageRolls.rollItem(this);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      speaker: {
        actor: itemToRender.actor.id,
        token: null, //token,
        alias: itemToRender.actor.name,
        scene: game.user.viewedScene
      }
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    // Render the template
    chatData["content"] = await renderTemplate(template, templateData);

    // Enrich the message to parse inline rolls.

    // this line causes deprecation warnings due to missing asyinc= for rolls
    // TODO: remove once rolls are correctly pre-rolled above
    chatData.content =await TextEditor.enrichHTML(chatData.content, { rolls: true, rollData: rollData, async: true });

    let [ sequencerAnim, hitEvaluationResults ] = preCreateChatMessageHandler.handle(chatData, {
      targets: numTargets.targets,
      type: this.type,
      actor: this.actor,
      token: token,
      powerLevel: this.system.powerLevel?.value,
      sequencer: this.system.sequencer
    }, null);

    // If 3d dice are enabled, handle them first.
    if (game.dice3d && !game.settings.get("dice-so-nice", "animateInlineRoll")) {
      let contentHtml = $(chatData.content);
      let rolls = [];
      let damageRolls = [];

      if (contentHtml.length > 0) {
        // Find all property rows.
        let $rows = contentHtml.find('.card-prop');
        if ($rows.length > 0) {
          // Iterate over properties.
          $rows.each(function(index) {
            let $row_self = $(this);
            let row_text = $row_self.html();
            // Attack or Target rows - keep all, in right order
            if (row_text.includes('Attack:') || row_text.includes('Target:')) {
              let $roll_html = $row_self.find('.inline-result');
              if ($roll_html.length > 0) {
                $roll_html.each(function(i, e){
                  let roll = Roll.fromJSON(unescape(e.dataset.roll));
                  if (row_text.includes('Attack:') && roll.terms[0].faces != 20) {
                    // Not an attack roll, usually a target roll, roll first
                    rolls.unshift(roll);
                  } else rolls.push(roll);
                });
              }
            }
            // Hit or Spell level rows - keep only the last
            else if (row_text.includes('Hit:') || row_text.includes('Level Spell:')) {
              damageRolls = []; // Reset for each line
              let $roll_html = $row_self.find('.inline-result');
              if ($roll_html.length > 0) {
                $roll_html.each(function(i, e){
                  let roll = Roll.fromJSON(unescape(e.dataset.roll));
                  damageRolls.push(roll);
                });
              }
            }
          });
        }

        // If we have roll data, handle a 3d roll.
        rolls = rolls.concat(damageRolls);
        if (rolls.length > 0) {
          for (let r of rolls) {
            await game.dice3d.showForRoll(r, game.user, true,
              chatData["whisper"] ? chatData["whisper"] : null,
              chatData["blind"] && !game.user.isGM ? true : false);
          }
        }
      }
    }

    // Play sequencer animation after the dice, if we got any
    if(sequencerAnim) {
      sequencerAnim.play();
    }

    if (!foundry.utils.isEmpty(itemUpdateData)) this.update(itemUpdateData, {});
    if (!foundry.utils.isEmpty(actorUpdateData)) this.actor.update(actorUpdateData);

    // Handle Monk AC bonus
    //TODO: remove dependency on times-up once core Foundry handles AE expiry
    if (game.modules.get("times-up")?.active) {
      await this._handleMonkAC();
    }

    // Extra data accessible as "archmage" in embedded macros
    let macro_data = {
      item: itemToRender,
      hitEval: hitEvaluationResults,
      suppressMessage: false,
      // rollData: rollData
    };

    // If there is an embedded macro attempt to execute it
    if (this.system.embeddedMacro?.value.length > 0) {

      if (!game.user.hasPermission("MACRO_SCRIPT")) {
        ui.notifications.warn(game.i18n.localize("ARCHMAGE.CHAT.embeddedMacroPermissionError"));
      } else {
        // Run our own function to bypass macro parameters limitations - based on Foundry's _executeScript

        // Add variables to the evaluation scope
        const speaker = ChatMessage.implementation.getSpeaker();
        const character = game.user.character;
        const actor = this.actor;

        // Attempt script execution
        const AsyncFunction = (async function(){}).constructor;
        const fn = new AsyncFunction("speaker", "actor", "token", "character", "archmage", this.system.embeddedMacro.value);
        try {
          await fn.call(this, speaker, actor, token, character, macro_data);
        } catch(ex) {
          ui.notifications.error("There was an error in your macro syntax. See the console (F12) for details");
          console.error(`Embedded macro for '${this.name}' failed with: ${ex}`, ex);
        }
      }
    }

    if (macro_data.suppressMessage) return;
    return ChatMessage.create(chatData, { displaySheet: false });
  }

  /**
   * Roll an item's recharge, and update its quantity based on the maxQuantity.
   *
   * @param {Object} options      Options to pass during execution.
   * @param {Boolean} options.createMessage  Whether or not to render chat messages.
   * @returns {Promise.<Object>}  A promise resolving to an object with roll results.
   */
  async recharge({createMessage=true}={}) {
    // Only update for recharge powers/items.
    if (!this.system?.powerUsage?.value == 'recharge') return;

    // And only if recharge is feasible
    // if (recharge <= 0 || recharge > 20) return;

    // If a recharge power does not have a recharge value, assume 16+
    let recharge = Number(this.system?.recharge?.value) || 16;

    let actor = this.actor;
    let maxQuantity = this.system?.maxQuantity?.value ?? 1;
    let currQuantity = this.system?.quantity?.value ?? 0;
    if (maxQuantity - currQuantity <= 0) return;
    let rechAttempts = this.system?.rechargeAttempts?.value ?? 0;

    let roll = new Roll('d20');
    await roll.roll();

    let rechargeSuccessful = roll.total >= Number(recharge);

    if (createMessage) {
      // Basic template rendering data
      const template = `systems/archmage/templates/chat/recharge-card.html`
      const token = actor.token;

      // Basic chat message data
      const chatData = {
        user: game.user.id,
        type: 5,
        roll: roll,
        speaker: {
          actor: actor.id,
          token: actor.token,
          alias: actor.name,
          scene: game.user.viewedScene
        }
      };

      const templateData = {
        actor: actor,
        title: this.name,
        tokenId: token ? `${token.id}` : null,
        success: rechargeSuccessful,
        data: chatData,
      };

      // Toggle default roll mode
      let rollMode = game.settings.get("core", "rollMode");
      if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
      if (rollMode === "blindroll") chatData["blind"] = true;

      // Render the template
      chatData["content"] = await renderTemplate(template, templateData);
      ChatMessage.create(chatData, { displaySheet: false });
    }

    // Update the item.
    if (rechargeSuccessful) {
      await this.update({
        data: { quantity: { value: Number(currQuantity) + 1 } }
      });
    } else {
      // Record recharge attempt
      await this.update({
        data: { rechargeAttempts: { value: Number(rechAttempts) + 1 } }
      });
    }

    return {
      roll: roll,
      total: roll.total,
      target: recharge,
      success: rechargeSuccessful
    };
  }

  /**
   * Check if we are rolling a monk form, add related AC active effect
   */
  async _handleMonkAC() {
    if (this.type != "power") return;
    if (!this.actor.system.details.detectedClasses?.includes("monk")) return;

    let effects = this.actor.effects;
    let group = this.system.group.value.toLowerCase();
    let bonusMagnitudeMap = {};
    bonusMagnitudeMap[game.i18n.localize("ARCHMAGE.MONKFORMS.opening")] = 1;
    bonusMagnitudeMap[game.i18n.localize("ARCHMAGE.MONKFORMS.flow")] = 2;
    bonusMagnitudeMap[game.i18n.localize("ARCHMAGE.MONKFORMS.finishing")] = 3;
    if (!Object.keys(bonusMagnitudeMap).includes(group)) return;
    let bonusMagnitude = bonusMagnitudeMap[group];

    // Check for other monk AC bonuses
    let effectsToDelete = [];
    let alreadyHasBetterBonus = false;
    effects.forEach(e => {
      if (e.data.label == game.i18n.localize("ARCHMAGE.MONKFORMS.aelabel")) {
        if (Number(e.data.changes[0].value) <= bonusMagnitude) {
          effectsToDelete.push(e.id);
        }
        else alreadyHasBetterBonus = true;
      }
    });
    await this.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);

    if (alreadyHasBetterBonus) return;

    // Now create new AC bonus effect
    let effectData = {
      label: game.i18n.localize("ARCHMAGE.MONKFORMS.aelabel"),
      icon: "icons/svg/shield.svg",
      changes: [{
        key: "data.attributes.ac.value",
        value: bonusMagnitude,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD
      }]
    }
    MacroUtils.setDuration(effectData, CONFIG.ARCHMAGE.effectDurations.StartOfNextTurn)
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  /* -------------------------------------------- */
  /*  Chat Card Data
  /* -------------------------------------------- */

  getChatData(htmlOptions, skipInlineRolls) {
    const data = this[`_${this.type}ChatData`]();
    if (!skipInlineRolls) {
      htmlOptions = foundry.utils.mergeObject(htmlOptions ?? {}, { async: false});
      data.description.value = data.description.value !== undefined ? TextEditor.enrichHTML(data.description.value, htmlOptions) : '';
    }
    return data;
  }


  _powerChatData() {
    const data = duplicate(this.system);
    const tags = [
      {
        label: game.i18n.localize('ARCHMAGE.CHAT.actionType'),
        value: CONFIG.ARCHMAGE.actionTypes[data.actionType.value]
      },
      {
        label: game.i18n.localize('ARCHMAGE.CHAT.powerUsage'),
        value: CONFIG.ARCHMAGE.powerUsages[data.powerUsage.value]
      },
      {
        label: game.i18n.localize('ARCHMAGE.CHAT.powerSource'),
        value: CONFIG.ARCHMAGE.powerSources[data.powerSource.value]
      },
      {
        label: game.i18n.localize('ARCHMAGE.CHAT.powerType'),
        value: CONFIG.ARCHMAGE.powerTypes[data.powerType.value]
      },
      {
        label: data.powerLevel !== undefined ? data.powerLevel.label : 'Level',
        value: game.i18n.localize('ARCHMAGE.level') + ' ' + (data.powerLevel !== undefined ? data.powerLevel.value : this.actor.system.details.level.value)
      }
    ];

    const propKeys = [
      'recharge',
      'sustainOn',
      'trigger',
      'target',
      'always',
      'attack',
      'hit',
      'hitEven',
      'hitOdd',
      'crit',
      'miss',
      'missEven',
      'missOdd',
      'cost',
    ];
    const properties = propKeys.map(k => {
      return {
        label: data[k] ? game.i18n.localize(`ARCHMAGE.CHAT.${k}`) : null,
        value: data[k] ? data[k].value : null,
      };
    })

    const featKeys = [
      'adventurer',
      'champion',
      'epic',
    ];
    const feats = featKeys.map(k => {
      return {
        label: data.feats[k] ? game.i18n.localize(`ARCHMAGE.CHAT.${k}`) : null,
        description: data.feats[k] ? data.feats[k].description.value : null,
        isActive: data.feats[k] ? data.feats[k].isActive.value : null,
      };
    });

    let effectKeys = [
      'effect',
      'castBroadEffect',
      'castPower',
      'sustainedEffect',
      'finalVerse',
      'spellLevel2',
      'spellLevel3',
      'spellLevel4',
      'spellLevel5',
      'spellLevel6',
      'spellLevel7',
      'spellLevel8',
      'spellLevel9',
      'spellLevel10',
      'spellChain',
      'breathWeapon',
      'special',
    ];

    // Add spell level entries only if the current spell level is high enough
    [2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(i => {
      if (Number(data.powerLevel.value) < i) {
        effectKeys = effectKeys.filter(x => x != `spellLevel${i}`)
      }
    })

    const effects = effectKeys.map(k => {
      return {
        label: data[k] ? game.i18n.localize(`ARCHMAGE.CHAT.${k}`) : null,
        value: data[k] ? data[k].value : null,
      };
    });

    data.tags = tags.filter(t => t.value !== null && t.value !== undefined && t.value != '');
    data.properties = properties.filter(p => p.value !== null && p.value !== undefined && p.value != '');
    data.feats = feats.filter(f => f.description !== null && f.description !== undefined && f.description !== '');
    data.effects = effects.filter(e => e.value !== null && e.value !== undefined && e.value != '');
    data.effect = {
      label: game.i18n.localize(`ARCHMAGE.CHAT.effect`),
      value: data.effect.value
    };
    data.special = {
      label: game.i18n.localize(`ARCHMAGE.CHAT.special`),
      value: data.special.value
    };
    return data;
  }

  _equipmentChatData() {
    const data = duplicate(this.system);
    return data;
  }

  _actionChatData() {
    const data = duplicate(this.system);
    return data;
  }

  _traitChatData() {
    const data = duplicate(this.system);
    return data;
  }

  _nastierSpecialChatData() {
    const data = duplicate(this.system);
    return data;
  }

  _toolChatData() {
    const data = duplicate(this.system);
    return data;
  }

  _lootChatData() {
    const data = duplicate(this.system);
    return data;
  }

  static chatListeners(html) {

    // Chat card actions
    html.on('click', '.card-buttons button', ev => {
      ev.preventDefault();

      // Extract card data
      const button = $(ev.currentTarget),
        messageId = button.parents('.message').attr("data-message-id"),
        senderId = game.messages.get(messageId).user.id,
        card = button.parents('.chat-card');

      // Confirm roll permission
      if (!game.user.isGM && (game.user.id !== senderId)) return;

      // Get the Actor from a synthetic Token
      let actor;
      const tokenKey = card.attr("data-token-id");
      if (tokenKey) {
        const [sceneId, tokenId] = tokenKey.split(".");
        let token;
        if (sceneId === canvas.scene.id) token = canvas.tokens.get(tokenId);
        else {
          const scene = game.scenes.get(sceneId);
          if (!scene) return;
          let tokenData = scene.data.tokens.find(t => t.id === Number(tokenId));
          if (tokenData) token = new Token(tokenData);
        }
        if (!token) return;
        actor = Actor.fromToken(token);
      } else actor = game.actors.get(card.attr('data-actor-id'));

      // Get the Item
      if (!actor) return;
      const itemId = card.attr("data-item-id");
      let itemData = actor.items.find(i => i.id === itemId);
      if (!itemData) return;
      const item = new CONFIG.Item.documentClass(itemData, { actor: actor });

      // Get the Action
      const action = button.attr("data-action");

      // Weapon attack
      if (action === "weaponAttack") item.rollWeaponAttack(ev);
      else if (action === "weaponDamage") item.rollWeaponDamage(ev);
      else if (action === "weaponDamage2") item.rollWeaponDamage(ev, true);

      // Spell actions
      else if (action === "spellAttack") item.rollSpellAttack(ev);
      else if (action === "spellDamage") item.rollSpellDamage(ev);

      // Feat actions
      else if (action === "featAttack") item.rollFeatAttack(ev);
      else if (action === "featDamage") item.rollFeatDamage(ev);

      // Consumable usage
      else if (action === "consume") item.rollConsumable(ev);

      // Tool usage
      else if (action === "toolCheck") item.rollToolCheck(ev);
    });
  }
}
