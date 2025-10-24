// main.js
/**
 * @file Main entry point. Initializes all addon systems.
 */
import { world, system } from "@minecraft/server";
import { initializeTracker } from "./modules/entity-manager";
import { initializeConversationHandler } from "./modules/conversation";
import { initializePlayerPreviewSystem } from "./modules/player-build-preview";
import { ensureWaitingBoxTickingArea, log } from "./utils";


initializeTracker({ entityType: "minecraft:villager", runInterval: 100 });
initializeConversationHandler(); 
initializePlayerPreviewSystem(world); 
ensureWaitingBoxTickingArea(world);

console.log("[Mobs&Mates]] Systems loaded. ✅");

