// modules/conversation.js

/**
 * @file Manages player-entity conversations, intent classification, and action delegation.
 */

import { world, system } from "@minecraft/server"; // Adicionado system
import { classifyMessage } from "../classifier";
import { villager_actions_intents } from "../intents/villager-actions";
import { confirmation_intents } from "../intents/confirmation";
import { cleanAndTokenize, log } from "../utils";
import { thresholdDistanceFactor, nameMatchThreshold } from "../config/villager-config";
import { getClosestEntity, getTrackedEntities } from "./entity-manager";
import { startAction } from "./action-handler";
import { t } from "./translator";

const conversationManager = new Map(); // Tracks who is talking to whom {playerId: entityId}

/**
 * Handles confirmation of the villager's name (e.g., "Are you talking to me?").
 */
function handleNameConfirmation(player, villagerData, msg) {
    const conf = classifyMessage(msg, confirmation_intents, thresholdDistanceFactor);
    const entity = villagerData.entity;
    
    // Independentemente da resposta, a tentativa de confirmação acaba aqui.
    villagerData.pendingNameConfirmation = null;

    if (conf.status === "matched" && conf.intent === "yes") {
        // Se sim, trava a conversa e pergunta o que fazer.
        conversationManager.set(player.id, entity.id);
        player.sendMessage(t(player, "villager_unclear_intent", entity.nameTag));
    } else {
        // Se não (ou se não entendeu), o aldeão assume que não era com ele.
        player.sendMessage(t(player, "villager_confirm_no", entity.nameTag));
    }
}


/**
 * Handles confirmation of a specific action (e.g., "Should I go mining?").
 */
function handleActionConfirmation(player, villagerData, msg) {
    const conf = classifyMessage(msg, confirmation_intents, thresholdDistanceFactor);
    
    if (conf.status === "matched" && conf.intent === "yes") {
        startAction(villagerData, villagerData.pendingAction.action, player);
    } else if (conf.status === "matched" && conf.intent === "no") {
        player.sendMessage(t(player, "villager_cancel_action", villagerData.entity.nameTag));
        villagerData.pendingAction = null;
    } else {
        player.sendMessage(t(player, "villager_unclear_confirmation", villagerData.entity.nameTag));
    }
}

/**
 * Main handler for the chatSend event.
 */
function onChatSend(event) {
    const { message, sender: player } = event;
    const trackedEntities = getTrackedEntities();
    if (trackedEntities.size === 0) return;

    const raw = message.trim();
    const msg = raw.toLowerCase();
    const tokens = cleanAndTokenize(msg);

    // --- NOVA LÓGICA DE FLUXO ---

    // 1. O JOGADOR ESTÁ RESPONDENDO A UMA CONFIRMAÇÃO DE NOME?
    const confirmingVillager = [...trackedEntities.values()].find(v => v.pendingNameConfirmation === player.id);
    if (confirmingVillager) {
        handleNameConfirmation(player, confirmingVillager, msg);
        return; // A interação termina aqui.
    }

    let targetEntityData = null;
    let isPerfectMatch = false;

    // 2. O JOGADOR JÁ ESTÁ EM UMA CONVERSA TRAVADA?
    const lockedEntityId = conversationManager.get(player.id);
    if (lockedEntityId) {
        targetEntityData = [...trackedEntities.values()].find(v => v.entity.id === lockedEntityId);
        if (!targetEntityData) conversationManager.delete(player.id); // Limpa se o aldeão sumiu
    } else {
        // 3. SE NÃO, O JOGADOR ESTÁ INICIANDO UMA NOVA CONVERSA?
        const nameMatch = getClosestEntity(tokens);
        if (nameMatch.name && nameMatch.score >= nameMatchThreshold) {
            const potentialTarget = trackedEntities.get(nameMatch.name);

            // Verifica se o aldeão já está ocupado com outro jogador
            if ([...conversationManager.values()].includes(potentialTarget.entity.id)) {
                player.sendMessage(t(player, "villager_busy_other", potentialTarget.entity.nameTag));
                return;
            }
            
            // É um NOME APROXIMADO ou PERFEITO?
            if (nameMatch.score < 1.0) {
                // É APROXIMADO. Pede confirmação.
                potentialTarget.pendingNameConfirmation = player.id;
                player.sendMessage(t(player, "villager_confirm_name", potentialTarget.entity.nameTag));

                // Inicia um timer para cancelar a confirmação se não houver resposta
                system.runTimeout(() => {
                    if (potentialTarget.pendingNameConfirmation === player.id) {
                        potentialTarget.pendingNameConfirmation = null;
                        try { // Usa try-catch caso o jogador já tenha saído do mundo
                            player.sendMessage(t(player, "villager_confirm_timeout", potentialTarget.entity.nameTag));
                        } catch(e) {}
                    }
                }, 300); // 15 segundos (15 * 20 ticks)

                return; // A interação termina aqui, esperando a resposta.
            } else {
                // É PERFEITO. Continua a conversa.
                targetEntityData = potentialTarget;
                isPerfectMatch = true;
            }
        }
    }

    if (!targetEntityData || targetEntityData.busy) return;

    const entity = targetEntityData.entity;
    
    // 4. LIDAR COM A CONVERSA
    if (targetEntityData.pendingAction) {
        conversationManager.delete(player.id);
        handleActionConfirmation(player, targetEntityData, msg);
        return;
    }

    const action = classifyMessage(msg, villager_actions_intents, thresholdDistanceFactor);
    log(`[Convo] Player: ${player.name} | Target: ${entity.nameTag} | Intent: ${action.intent || 'none'}`);

    if (action.status === "matched") {
        conversationManager.delete(player.id);
        startAction(targetEntityData, action, player);
    } else {
        // Só trava a conversa se for um nome perfeito ou se já estava travada.
        // Isso evita que um nome aproximado pule direto para a pergunta.
        if (isPerfectMatch || lockedEntityId) {
            conversationManager.set(player.id, entity.id);
            player.sendMessage(t(player, "villager_unclear_intent", entity.nameTag));
        }
    }
}

function onPlayerLeave(event) {
    const { playerId, playerName } = event;
    if (conversationManager.has(playerId)) {
        conversationManager.delete(playerId);
        log(t(undefined, "log_conversation_lock_release", playerName));
    }
}

export function initializeConversationHandler() {
    world.afterEvents.chatSend.subscribe(onChatSend);
    world.afterEvents.playerLeave.subscribe(onPlayerLeave);
}