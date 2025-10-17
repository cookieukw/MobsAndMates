// config/villager-config.js

/**
 * @file Central configuration for the Villager AI.
 * Tweak these values to change the addon's behavior.
 */

// --- General Settings ---
export const DEBUG = true; // Set to true to use shorter task times for testing.
export const isWarn = true; // Set to false to disable all log messages.
export const thresholdDistanceFactor = 0.25; // How forgiving the intent matching is (lower is stricter).
export const nameMatchThreshold = 0.6; // How closely a name must be matched (higher is stricter).
export const waitingBoxCoords = { x: 0, y: 319, z: 0 }; // Location where villagers wait.

// --- Action Timings (in minutes) ---
const short_time = DEBUG ? [0.1] : [5, 8]; // 6 seconds in debug, 5-8 mins in normal
const medium_time = DEBUG ? [0.2] : [10, 15];
const long_time = DEBUG ? [0.3] : [20, 30];

export const actionTimes = {
  minerar: medium_time,
  construir: long_time,
  caçar: short_time,
  proteger: short_time,
};

// --- Action Specifics (Tools & Loot) ---
export const actionDetails = {
  minerar: {
    tool: "minecraft:iron_pickaxe",
    loot_table: [
      { item: "minecraft:coal", min_qty: 3, max_qty: 8, time_factor: 1 },
      { item: "minecraft:raw_iron", min_qty: 2, max_qty: 5, time_factor: 3 },
      { item: "minecraft:raw_copper", min_qty: 2, max_qty: 6, time_factor: 2 },
      { item: "minecraft:raw_gold", min_qty: 1, max_qty: 3, time_factor: 8 },
      { item: "minecraft:diamond", min_qty: 1, max_qty: 2, time_factor: 15 },
      { item: "minecraft:emerald", min_qty: 1, max_qty: 1, time_factor: 20 },
    ],
  },
  caçar: {
    tool: "minecraft:iron_sword",
    loot_table: [
      { item: "minecraft:chicken", min_qty: 2, max_qty: 5, time_factor: 1 },
      { item: "minecraft:porkchop", min_qty: 2, max_qty: 4, time_factor: 2 },
      { item: "minecraft:beef", min_qty: 1, max_qty: 3, time_factor: 3 },
      { item: "minecraft:leather", min_qty: 1, max_qty: 4, time_factor: 2 },
    ],
  },
};