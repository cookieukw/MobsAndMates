// modules/entity-manager.js

/**
 * @file Manages tracking of named entities in the world.
 */

import { world, system } from "@minecraft/server";
import { log, stripColorCodes } from "../utils";
import { similarity } from "../utils";
import { t } from "./translator";

const trackedEntities = new Map();

/**
 * Periodically scans for named entities of a specific type.
 * @param {string} entityType The entity identifier (e.g., "minecraft:villager").
 */
function updateTrackedEntities(entityType) {
  const overworld = world.getDimension("overworld");
  for (const entity of overworld.getEntities({ type: entityType })) {
    const name = entity.nameTag?.trim();
    if (!name) continue;

    const key = stripColorCodes(name.toLowerCase());
    if (!trackedEntities.has(key)) {
      trackedEntities.set(key, {
        entity: entity,
        busy: false,
        pendingAction: null,
        pendingNameConfirmation: null,
      });
      log(t(undefined, "villager.registered", name));
    }
  }
}

/**
 * Finds the closest matching FULL entity name within the player's message tokens.
 * Compares the joined player message against the full stored names.
 * @param {string[]} msgTokens - Lowercase words from the player's message (e.g., ["finvor", "ironhands", "come", "here"]).
 * @returns {{name: string | null, score: number}} - The best match found (returns the full lowercase name key).
 */
export function getClosestEntity(msgTokens) {
  let bestMatch = { name: null, score: 0 };
  // Join the player's tokens back into a single lowercase string for comparison
  const cleanedPlayerMessage = msgTokens.join(" "); // e.g., "finvor ironhands come here"

  // Iterate through the tracked entities Map
  // 'villagerNameKey' is the full, lowercase, color-stripped name (e.g., "finvor ironhands")
  for (const [villagerNameKey, villagerData] of trackedEntities) {
    // --- Calculate Similarity Score ---
    // Compare the player's full cleaned message against the villager's full key name
    const score = similarity(cleanedPlayerMessage, villagerNameKey);

    // --- Smart Check (Optional but Recommended) ---
    // If the villager's name is found *within* the player's message,
    // it's a very strong indicator, even if extra words lower the overall score slightly.
    // We might want to boost the score in this case or use it as a primary check.
    // For now, we rely purely on the similarity score of the full strings.
    // if (cleanedPlayerMessage.includes(villagerNameKey)) {
    //     // Potential score boost? Or different logic?
    // }

    // --- Update Best Match ---
    // If the current score is better than the best score found so far...
    if (score > bestMatch.score) {
      // Update the best match to this villager's name key and score
      bestMatch = { name: villagerNameKey, score: score };
    }
  }

  // Return the best match found (can still be null if no names were similar enough)
  return bestMatch;
}
/**
 * Starts the entity tracking system.
 * @param {{entityType: string, runInterval: number}} config
 */
export function initializeTracker({ entityType, runInterval }) {
  system.runInterval(() => updateTrackedEntities(entityType), runInterval);
}

/**
 * Returns the Map of all tracked entities.
 * @returns {Map<string, object>}
 */
export function getTrackedEntities() {
  return trackedEntities;
}
