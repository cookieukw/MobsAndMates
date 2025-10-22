// modules/entity-manager.js

/**
 * @file Manages tracking of named entities in the world.
 */

import { world, system } from "@minecraft/server";
import { log } from "../utils";
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

        const formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const key = formatted.toLowerCase();

        if (!trackedEntities.has(key)) {
            trackedEntities.set(key, {
                entity: entity,
                busy: false,
                pendingAction: null,
                pendingNameConfirmation: null
            });
            log(t(undefined, "villager.registered", formatted));
        }
    }
}

/**
 * Finds the closest matching entity name from a list of words.
 * @param {string[]} msgTokens Words from the player's message.
 * @returns {{name: string | null, score: number}} The best match found.
 */
export function getClosestEntity(msgTokens) {
    let best = { name: null, score: 0 };
    for (const [name] of trackedEntities) {
        for (const token of msgTokens) {
            const score = similarity(token, name.toLowerCase());
            if (score > best.score) {
                best = { name, score };
            }
        }
    }
    return best;
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