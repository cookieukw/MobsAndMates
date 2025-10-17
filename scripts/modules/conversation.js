// modules/conversation.js

/**
 * @file Manages player-entity conversations, intent classification, and action delegation.
 */

import { world, system } from "@minecraft/server"; // Adicionado system
import { classifyMessage } from "../classifier";
import { villager_actions_intents } from "../intents/villager-actions";
import { confirmation_intents } from "../intents/confirmation";
import { cleanAndTokenize, log } from "../utils";
import {
  thresholdDistanceFactor,
  nameMatchThreshold,
} from "../config/villager-config";
import { getClosestEntity, getTrackedEntities } from "./entity-manager";
import { startAction, handleComeHereAction } from "./action-handler";
import { t } from "./translator";

const conversationManager = new Map(); // Tracks who is talking to whom {playerId: entityId}

/**
 * Handles confirmation of the villager's name (e.g., "Are you talking to me?").
 */
function handleNameConfirmation(player, villagerData, msg) {
  const conf = classifyMessage(
    msg,
    confirmation_intents,
    thresholdDistanceFactor
  );
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
  const conf = classifyMessage(
    msg,
    confirmation_intents,
    thresholdDistanceFactor
  );

  if (conf.status === "matched" && conf.intent === "yes") {
    startAction(villagerData, villagerData.pendingAction.action, player);
  } else if (conf.status === "matched" && conf.intent === "no") {
    player.sendMessage(
      t(player, "villager_cancel_action", villagerData.entity.nameTag)
    );
    villagerData.pendingAction = null;
  } else {
    player.sendMessage(
      t(player, "villager_unclear_confirmation", villagerData.entity.nameTag)
    );
  }
}

/**
 * Main handler for the chatSend event. It orchestrates the entire conversation flow.
 * @param {import("@minecraft/server").ChatSendAfterEvent} event The chat event data.
 */
function onChatSend(event) {
  // Destructure the event to get the message and the player who sent it.
  const { message, sender: player } = event;
  const trackedEntities = getTrackedEntities();
  if (trackedEntities.size === 0) return; // Exit if no villagers are being tracked.

  const raw = message.trim();
  const msg = raw.toLowerCase();
  const tokens = cleanAndTokenize(msg);

  // 1. IS THE PLAYER REPLYING TO A NAME CONFIRMATION?
  // Find if any villager is waiting for this specific player to confirm their name.
  const confirmingVillager = [...trackedEntities.values()].find(
    (v) => v.pendingNameConfirmation === player.id
  );
  if (confirmingVillager) {
    handleNameConfirmation(player, confirmingVillager, msg);
    return; // The interaction ends here for this chat message.
  }

  let targetEntityData = null;
  let isPerfectMatch = false;

  // 2. IS THE PLAYER ALREADY IN A LOCKED CONVERSATION?
  // Check if the conversation manager has a lock for this player.
  const lockedEntityId = conversationManager.get(player.id);
  if (lockedEntityId) {
    // If so, the target is the entity they are locked with.
    targetEntityData = [...trackedEntities.values()].find(
      (v) => v.entity.id === lockedEntityId
    );
    if (!targetEntityData) {
      conversationManager.delete(player.id); // Clean up if the entity no longer exists.
    }
  } else {
    // 3. IF NOT, IS THE PLAYER STARTING A NEW CONVERSATION?
    // Find the best name match in the player's message.
    const nameMatch = getClosestEntity(tokens);

    // Check if the match score is above the required threshold.
    if (nameMatch.name && nameMatch.score >= nameMatchThreshold) {
      const potentialTarget = trackedEntities.get(nameMatch.name);

      // Check if the potential target is already in a conversation with another player.
      if (
        [...conversationManager.values()].includes(potentialTarget.entity.id)
      ) {
        player.sendMessage(
          t(player, "villager_busy_other", potentialTarget.entity.nameTag)
        );
        return;
      }

      // Is it an APPROXIMATE or a PERFECT name match?
      if (nameMatch.score < 1.0) {
        // It's an APPROXIMATE match. Ask for confirmation.
        potentialTarget.pendingNameConfirmation = player.id;
        player.sendMessage(
          t(player, "villager_confirm_name", potentialTarget.entity.nameTag)
        );

        // Start a timer to cancel the confirmation if there's no reply.
        system.runTimeout(() => {
          // Check if the villager is still waiting for the same player.
          if (potentialTarget.pendingNameConfirmation === player.id) {
            potentialTarget.pendingNameConfirmation = null;
            try {
              // Use a try-catch in case the player has logged off.
              player.sendMessage(
                t(
                  player,
                  "villager_confirm_timeout",
                  potentialTarget.entity.nameTag
                )
              );
            } catch (e) {}
          }
        }, 300); // 15 seconds (15 * 20 ticks)

        return; // End interaction here, waiting for the player's "yes/no" response.
      } else {
        // It's a PERFECT match. Proceed with the conversation.
        targetEntityData = potentialTarget;
        isPerfectMatch = true;
      }
    }
  }

  // Exit if no target was determined or if the target is busy with a long task.
  if (!targetEntityData || targetEntityData.busy) return;

  const entity = targetEntityData.entity;

  // 4. HANDLE THE ACTUAL CONVERSATION LOGIC
  // If the villager is waiting for an action confirmation (e.g. for a quest).
  if (targetEntityData.pendingAction) {
    conversationManager.delete(player.id);
    handleActionConfirmation(player, targetEntityData, msg);
    return;
  }

  // Classify the message to find out the player's intent.
  const action = classifyMessage(
    msg,
    villager_actions_intents,
    thresholdDistanceFactor
  );
  log(
    `[Convo] Player: ${player.name} | Target: ${entity.nameTag} | Intent: ${
      action.intent || "none"
    }`
  );

  if (action.status === "matched") {
    // If an intent was successfully matched, unlock the conversation.
    conversationManager.delete(player.id);

    // Use a switch to delegate the command to the correct action handler.
    switch (action.intent) {
      case "come_here":
        // Special case for real-time actions.
        handleComeHereAction(targetEntityData, player);
        break;

      // Other special cases could be added here in the future.
      case "build":
        player.sendMessage("debug para construir");
        break;
      case "mine":
        player.sendMessage("debug para construir"); // Default case for long-running tasks like mining, hunting, etc.
        startAction(targetEntityData, action, player);
        break;
      case "hunt":
        player.sendMessage("debug para construir"); // Default case for long-running tasks like mining, hunting, etc.
        startAction(targetEntityData, action, player);
        break;

      default:
        player.sendMessage("debug para outras ações");
        break;
    }
  } else {
    // If the intent was not understood, lock the conversation so the next message is directed to this villager.
    // This only happens on a perfect name match or if already in a locked conversation.
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
