// scripts/modules/initial-spawn-handler.js
import { world, system } from "@minecraft/server";
import { log } from "../utils"; // Importe sua função de log

// Helper function to find a safe spawn location near the player

function findSafeNearbyLocation(dimension, startLocation) {
  const radius = 3; // Search within 3 blocks
  for (let i = 0; i < 15; i++) {
    // Try 15 times
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radius + 1; // 1 to 3 blocks away
    const x = Math.floor(startLocation.x + dist * Math.cos(angle));
    const z = Math.floor(startLocation.z + dist * Math.sin(angle));

    // Find a valid Y level near the player's feet
    for (let yOffset = 2; yOffset > -3; yOffset--) {
      const y = Math.floor(startLocation.y) + yOffset;
      try {
        const blockBelow = dimension.getBlock({ x, y: y - 1, z });
        const feetBlock = dimension.getBlock({ x, y, z });
        const headBlock = dimension.getBlock({ x, y: y + 1, z });

        if (blockBelow?.isSolid && !feetBlock?.isSolid && !headBlock?.isSolid) {
          return { x: x + 0.5, y: y, z: z + 0.5 }; // Return center of block
        }
      } catch (e) {
        /* Ignore errors (out of bounds etc.) */
      }
    }
  }
  log(
    `[InitialSpawn] Could not find safe location near ${startLocation.x}, ${startLocation.z}`
  );
  return { x: startLocation.x, y: startLocation.y + 1, z: startLocation.z }; // Fallback above player
}

/**
 * Handles the playerSpawn event to give initial villagers.
 * @param {import("@minecraft/server").PlayerSpawnAfterEvent} event
 */
function onPlayerFirstSpawn(event) {
  const { player, initialSpawn } = event;

  // Only proceed if it's the very first time this player is spawning in the world
  if (initialSpawn) {
    // Double-check using our dynamic property (safety measure)
    const hasSpawnedBefore = player.getDynamicProperty(
      "mm:has_initial_spawned"
    );

    if (!hasSpawnedBefore) {
      log(
        `[InitialSpawn] First spawn detected for ${player.name}. Spawning villagers...`
      );
      player.setDynamicProperty("mm:has_initial_spawned", true); // Mark as spawned

      const dimension = player.dimension;
      const playerLoc = player.location;
      const numberOfVillagers = 3;

      for (let i = 0; i < numberOfVillagers; i++) {
        // Find a safe spot near the player for each villager
        const spawnLoc = findSafeNearbyLocation(dimension, playerLoc);
        try {
          const villager = dimension.spawnEntity(
            "minecraft:villager",
            spawnLoc
          );
          // Optional: Give them random names immediately?
          // villager.nameTag = `Villager_${Math.floor(Math.random() * 1000)}`;
        /*   log(
            `[InitialSpawn] Spawned villager ${i + 1} for ${
              player.name
            } at ${spawnLoc.x.toFixed(1)}, ${spawnLoc.y.toFixed(
              1
            )}, ${spawnLoc.z.toFixed(1)}`
          ); */
        } catch (e) {
          //log(`[InitialSpawn] Error spawning villager ${i + 1}: ${e}`);
        }
        // Small delay between spawns might be good practice, but often unnecessary
        // system.runTimeout(() => { /* spawn logic */ }, i * 5); // Example: 5 ticks apart
      }
    } else {
      /* log(
        `[InitialSpawn] Player ${player.name} spawned, but already marked as having initial spawn.`
      ); */
    }
  }
}

/**
 * Subscribes to the playerSpawn event.
 */
export function initializeInitialSpawnHandler() {
  world.afterEvents.playerSpawn.subscribe(onPlayerFirstSpawn);
 
}
