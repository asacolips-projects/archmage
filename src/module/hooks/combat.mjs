export async function combatStart(updateData) {
    // Ensure the start-of-turn hook fires for the first combatant, combatTurn doesn't fire here
    const firstCombatant = updateData.turns[0];
    if (firstCombatant) {
        await executeLifecycleMacro(firstCombatant, "startOfTurn");
    }
}

export async function combatTurn(combat, context, options) {
    const endCombatant = combat.combatant;
    const startCombatant = combat.nextCombatant;

    // Execute start/end of turn macros
    await executeLifecycleMacro(endCombatant, "endOfTurn");
    await executeLifecycleMacro(startCombatant, "startOfTurn");

    // Exit early if the feature is disabled.
    if (!game.settings.get('archmage', 'enableOngoingEffectsMessages')) return;

    // If the direction is negative, ignore the turn
    if (options.direction < 0) return;

    await handleTurnEffects("End", combat, endCombatant, context, options);
    await handleTurnEffects("Start", combat, startCombatant, context, options);
    if (CONFIG.ARCHMAGE.is2e) {
        await handleStoke(combat, context, options);
    }
    await handleRoundEffects(combat, context, options);
}

export async function handleTurnEffects(prefix, combat, combatant, context, options) {
    // Pseudo combatants may not have an actor.
    if (!combatant?.actor) return;

    const saveEndsEffects = ["EasySaveEnds", "NormalSaveEnds", "HardSaveEnds"];
    const hasImplacable = combatant?.actor?.flags.archmage?.implacable ?? false;
    const currentCombatantEffectData = {
        selfEnded: [],
        savesEnds: [],
        selfTriggered: [],
        otherEnded: [],
        unknown: [],
    };
    let effectsToDelete = [];
    let isDead = false;

    for (const effect of combatant.actor.effects) {
        if (!effect.active) continue;
        // Handle ongoing.
        const isOngoing = effect.flags.archmage?.ongoingDamage ? true: false;
        effect.isOngoing = isOngoing;
        const isCrit = isOngoing && effect.flags.archmage?.ongoingDamageCrit === true;
        effect.isCrit = isCrit;
        effect.ongoingDamage = isOngoing ? Number(effect.flags.archmage?.ongoingDamage) : 0;
        effect.ongoingTooltip = game.i18n.format('ARCHMAGE.CHAT.ongoingDamageTooltip', {
            damage: effect.ongoingDamage,
            type: effect.flags.archmage?.ongoingDamageType ?? '',
        });
        if (isCrit) {
            effect.ongoingDamage = effect.ongoingDamage * 2;
        }
        // Handle durations.
        if (effect.name === game.i18n.localize("ARCHMAGE.EFFECT.StatusDead")) isDead = true;
        const duration = effect.flags.archmage?.duration || "Unknown";
        if (duration === `${prefix}OfNextTurn`) {
            // Ensure it's the *next* turn
            if (combat.round  > effect.duration.startRound
            || (combat.round == effect.duration.startRound && combat.turn > effect.duration.startTurn)) {
                currentCombatantEffectData.selfEnded.push(effect);
                effectsToDelete.push(effect.id);
            }
        } else if (saveEndsEffects.includes(duration) && (prefix == "End" || (prefix == "Start" && hasImplacable))) {
            currentCombatantEffectData.savesEnds.push(effect);
        } else if (duration === `${prefix}OfEachTurn`) {
            currentCombatantEffectData.selfTriggered.push(effect);
        } else if (duration === "Unknown") {
            currentCombatantEffectData.unknown.push(effect);
        }
    }
    // Auto-delete AEs
    await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);

    // For each other combatant, check if their EndOfNextSourceTurn effects reference this combatant's actor as the source
    for (const otherCombatant of combat.combatants) {
        effectsToDelete = [];
        if (otherCombatant?.actor?.effects) {
            for (const effect of otherCombatant.actor.effects) {
                const isOngoing = effect.flags.archmage?.ongoingDamage ? true: false;;
                effect.isOngoing = isOngoing;
                const isCrit = isOngoing && effect.flags.archmage?.ongoingDamageCrit === true;
                effect.isCrit = isCrit;
                effect.ongoingDamage = isOngoing ? Number(effect.flags.archmage?.ongoingDamage) : 0;
                effect.ongoingTooltip = game.i18n.format('ARCHMAGE.CHAT.ongoingDamageTooltip', {
                    damage: effect.ongoingDamage,
                    type: effect.flags.archmage?.ongoingDamageType ?? '',
                });
                if (isCrit) {
                    effect.ongoingDamage = effect.ongoingDamage * 2;
                }
                const duration = effect.flags.archmage?.duration || "Unknown";
                if (duration === `${prefix}OfNextSourceTurn` && effect.origin === combatant.actor.uuid) {
                    // Ensure it's the *next* turn
                    if (combat.round  > effect.duration.startRound
                    || (combat.round == effect.duration.startRound && combat.turn > effect.duration.startTurn)) {
                        effect.otherName = otherCombatant.actor.name;
                        currentCombatantEffectData.otherEnded.push(effect);
                        effectsToDelete.push(effect.id);
                    }
                }
            }
            // Auto-delete AEs
            await otherCombatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
        }
    }

    if (!isDead) {
        await renderOngoingEffectsCard(`${prefix} of Turn Effects`, combatant, currentCombatantEffectData);
    }
}

export async function handleRoundEffects(combat, context, options) {
    // If we have not just started a new round, skip
    if (context.turn != 0) return;
    // For each other combatant, check if any of their effects has an EndOfRound lower than the current round
    const currentCombatantEffectData = {
        selfEnded: [],
        savesEnds: [],
        selfTriggered: [],
        otherEnded: [],
        unknown: [],
    };
    let effectsToDelete = [];
    for (const combatant of combat.combatants) {
        if (!combatant?.actor?.effects) continue;
        effectsToDelete = [];
        for (const effect of combatant.actor.effects) {
            const duration = effect.flags.archmage?.duration || "Unknown";
            if (duration === 'EndOfRound' && effect.flags.archmage?.endRound < context.round) {
                effect.otherName = combatant.actor.name;
                currentCombatantEffectData.otherEnded.push(effect);
                effectsToDelete.push(effect.id);
            }
        }
        // Auto-delete AEs
        await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
    }
    await renderOngoingEffectsCard(`End of Round ${context.round - 1} Effects`, null, currentCombatantEffectData);
}

export async function combatRound(combat, context, options) {
    await combatTurn(combat, context, options);
}

export async function preDeleteCombat(combat, context, options) {
    // Exit early if the feature is disabled.
    if (!game.settings.get('archmage', 'enableOngoingEffectsMessages')) return;

    const saveEndsEffects = ["EasySaveEnds", "NormalSaveEnds", "HardSaveEnds"];

    // Remove all battle effects
    for (const combatant of combat.combatants) {
        let effectsToDelete = [];

        if (combatant.token.isLinked) {
            // Probably player-facing, create end-of-combat chat card
            const currentCombatantEffectData = {
                selfEnded: [],
                savesEnds: [],
                selfTriggered: [],
                otherEnded: [],
                unknown: [],
            };

            for (const effect of combatant.actor.effects) {
                if (!effect.active) continue;
                const isOngoing = effect.flags.archmage?.ongoingDamage ? true: false;
                effect.isOngoing = isOngoing;
                const isCrit = isOngoing && effect.flags.archmage?.ongoingDamageCrit === true;
                effect.isCrit = isCrit;
                effect.ongoingDamage = isOngoing ? Number(effect.flags.archmage.ongoingDamage) : 0;
                effect.ongoingTooltip = game.i18n.format('ARCHMAGE.CHAT.ongoingDamageTooltip', {
                    damage: effect.ongoingDamage,
                    type: effect.flags.archmage?.ongoingDamageType ?? '',
                });
                if (isCrit) {
                    effect.ongoingDamage = effect.ongoingDamage * 2;
                }
                const duration = effect.flags.archmage?.duration || "Unknown";
                // If duration is longer than battle skip
                if (["Infinite", "EndOfArc"].includes(duration)) continue;
                // If it's a save-ends effect store it as such
                else if (saveEndsEffects.includes(duration)) {
                    currentCombatantEffectData.savesEnds.push(effect);
                }
                // If it's unknown also store it as such
                else if (duration === "Unknown") {
                    currentCombatantEffectData.unknown.push(effect);
                }
                // Everything else should end with the battle
                else {
                    currentCombatantEffectData.selfEnded.push(effect);
                    effectsToDelete.push(effect.id);
                }
            }

            // Render card
            await renderOngoingEffectsCard("End of Battle Effects", combatant, currentCombatantEffectData);

        } else {
            // Probably random monster, just delete silently
            for (const effect of combatant.actor.effects) {
                // If duration is "Infinite", skip
                if (effect.flags.archmage?.duration === "Infinite") continue;
                // Everything else should end with the battle
                else effectsToDelete.push(effect.id);
            }
        }

        // Auto-delete AEs
        await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
    }
}

async function handleStoke(combat, context, options) {
    const endCombatant = combat.combatant;
    if (endCombatant?.actor?.type === 'npc' && endCombatant.actor.system?.resources?.spendable?.stoke?.enabled) {
        const stokeDelta = endCombatant.getFlag('archmage', 'breathUsed') ? -1 : 1;
        await endCombatant.actor.update({
            'system.resources.spendable.stoke.current': stokeDelta + (endCombatant.actor.system.resources.spendable.stoke.current ?? 0),
        });
        await endCombatant.setFlag('archmage', 'breathUsed', false);
        // Show scrolling text for the update.
        endCombatant.actor._showScrollingText(stokeDelta, game.i18n.localize('ARCHMAGE.CHARACTER.RESOURCES.stoke'), {}, '#1776D5');
    }
}

/* -------------------------------------------- */

function saveEndsNameToTarget(saveEnds) {
    let target = 11;
    if (saveEnds === "EasySaveEnds") {
        target = 6;
    } else if (saveEnds === "NormalSaveEnds") {
        target = 11;
    } else if (saveEnds === "HardSaveEnds") {
        target = 16;
    }
    return target;
}

/* -------------------------------------------- */

async function renderOngoingEffectsCard(title, combatant, effectData) {
    // If no effects, return
    if (effectData.selfEnded.length === 0
        && effectData.savesEnds.length === 0
        && effectData.selfTriggered.length === 0
        && effectData.otherEnded.length === 0
        && effectData.unknown.length === 0) return;

    const template = "systems/archmage/templates/chat/ongoing-effects-card.html";
    const renderData = {
        title: title,
        combatant: combatant,  // Not used?
        selfEnded: effectData.selfEnded,
        hasSelfEnded: effectData.selfEnded.length > 0,
        saveEnds: effectData.savesEnds,
        hasSaveEnds: effectData.savesEnds.length > 0,
        selfTriggered: effectData.selfTriggered,
        hasSelfTriggered: effectData.selfTriggered.length > 0,
        otherEnded: effectData.otherEnded,
        hasOtherEnded: effectData.otherEnded.length > 0,
        unknown: effectData.unknown,
        hasUnknown: effectData.unknown.length > 0,
    };
    const html = await renderTemplate(template, renderData);

    // Create a chat card
    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor: combatant?.actor}),
        content: html
    };
    ChatMessage.create(chatData, {});
}

async function executeLifecycleMacro(combatant, hookName) {
    // If this isn't the actor's player, emit a socket request for that player to execute the hook
    if (game.user?.character?.id !== combatant.actor.id) {
        return game.socket.emit('system.archmage', {
            type: 'actorLifecycleHook',
            actorId: combatant.actor.id,
            hookName
        });
    }

    const speaker = ChatMessage.implementation.getSpeaker();
    const actor = game.user.character;
    const macroData = {
        // TODO: ???
    };

    const hookBody = combatant?.actor?.system?.lifecycleHooks?.[hookName]?.trim();
    if (!hookBody) return;

    // Can't run if you can't run
    if (!game.user.hasPermission("MACRO_SCRIPT")) return;

    // Run our own function to bypass macro parameters limitations - based on Foundry's _executeScript
    const AsyncFunction = async function () {}.constructor;
    try {
        const fn = new AsyncFunction("speaker", "actor", "archmage", hookBody);
        await fn.call(this, speaker, actor, macroData);
    } catch (ex) {
        ui.notifications.error(game.i18n.localize('ARCHMAGE.UI.errMacroSyntax'));
        console.error(`Lifecycle hook '${combatant.actor.name}' / ${hookName} failed with: ${ex}`, ex);
    }
}
