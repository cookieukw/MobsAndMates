// main.js

/**
 * @file This is the main entry point for the Villager AI addon.
 * It initializes all the necessary modules and systems.
 */

import { world } from "@minecraft/server";
import { initializeTracker } from "./modules/entity-manager";
import { initializeConversationHandler } from "./modules/conversation";
import { ensureWaitingBoxTickingArea } from "./utils";

// Initialize the system that tracks named villagers in the world.
initializeTracker({
  entityType: "minecraft:villager",
  runInterval: 100, // Ticks (20 ticks = 1 second)
});

// Initialize the system that listens to player chat and handles conversations.
initializeConversationHandler();

// Ensure the ticking area for the "waiting box" exists.
ensureWaitingBoxTickingArea(world);



