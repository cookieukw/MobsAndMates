// utils.js

/**
 * @file Contains generic utility functions used throughout the addon.
 */

import { world } from "@minecraft/server";
import { DEBUG, isWarn } from "./config/villager-config";
export const DYNPROP_PREVIEWS = "mbm:activePlayerPreviews";

/**
 * Custom logger. Sends a message to a player if provided, otherwise logs to console.
 * @param {string} message The message to log.
 * @param {import("@minecraft/server").Player} [player] The player to send the message to.
 */
export function log(message, player) {
  if (!DEBUG) return;

  if (!isWarn) {
    player.sendMessage(message);
  } else {
    if (typeof message === "object" && message !== null && message.rawtext) {
      world.sendMessage(message);
    } else {
      console.warn(String(message));
    }
  }
}

/**
 * Cleans and tokenizes a string.
 * @param {string} message The input string.
 * @returns {string[]} An array of words.
 */
export function cleanAndTokenize(message) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Calculates a similarity score between two strings (0 to 1).
 * @param {string} a First string.
 * @param {string} b Second string.
 * @returns {number} Similarity score.
 */
export function similarity(a, b) {
  // Levenshtein distance calculation
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

/**
 * Returns a random item from an array.
 * @param {Array<T>} arr The input array.
 * @returns {T} A random element from the array.
 */
export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Ensures a ticking area exists where entities can wait without being unloaded.
 * @param {import("@minecraft/server").World} world
 */
export function ensureWaitingBoxTickingArea(world) {
  try {
    world
      .getDimension("overworld")
      .runCommand(`tickingarea add 0 319 0 0 319 0 waiting_box true`);
    log("[System] Waiting Box ticking area ensured.");
  } catch (e) {
    log("[System] Ticking area 'waiting_box' might already exist.");
  }
}

export const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Calculates the squared distance between two locations.
 * Avoids using sqrt for performance when only comparing distances.
 * @param {{x: number, y: number, z: number}} pos1 First position.
 * @param {{x: number, y: number, z: number}} pos2 Second position.
 * @returns {number} The squared distance.
 */
export function distanceSquared(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return dx * dx + dy * dy + dz * dz;
}

export function randomColor() {
  const colors = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ];
  return "§" + colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Sends a translated message formatted as if spoken by a villager, using their assigned chat color.
 * @param {import("@minecraft/server").Player} player - The player to send the message to.
 * @param {import("@minecraft/server").Entity} villagerEntity - The villager entity speaking.
 * @param {string} messageKey - The translation key for the message content.
 * @param {(string | number)[]} messageArgs - Arguments for the translation key's placeholders (%1, %2...).
 */
export function sendVillagerMessage(
  player,
  villagerEntity,
  messageKey,
  messageArgs = []
) {
  if (!player || !villagerEntity?.isValid) return; // Safety check

  // Get the stored color, defaulting to white (§f) if missing
  const chatColor = villagerEntity.getDynamicProperty("mm:chat_color") ?? "§f";
  // Get the villager's current name tag (which includes the color code already)
  const nameTag = villagerEntity.nameTag ?? "Villager"; // Fallback name

  try {
    player.sendMessage({
      // Use rawtext to combine the colored prefix with the translated message
      rawtext: [
        {
          // The prefix uses the stored color, displays the name tag, and resets color after
          text: `${chatColor}<${nameTag}>§r `, // Includes name color automatically from nameTag
          // text: `${chatColor}<${villagerEntity.nameTag}>§r ` // Simpler if nameTag reliable
        },
        {
          // The actual message content, translated using the key and args
          translate: messageKey,
          with: messageArgs.map(String), // Ensure all args are strings
        },
      ],
    });
  } catch (e) {
    log(`Error sending villager message: ${e}`);
    // Fallback to simpler message if rawtext fails
    player.sendMessage(`${chatColor}<${nameTag}>§r ${messageKey}`);
  }
}

// Helper function to remove Minecraft color codes (§0-§f, §l, §o, §n, §m, §k, §r)
export function stripColorCodes(text) {
    if (!text) return "";
    return text.replace(/§.+?/g, "");
}