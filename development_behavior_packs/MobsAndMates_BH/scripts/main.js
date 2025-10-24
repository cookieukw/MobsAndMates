// main.js
/**
 * @file Main entry point. Initializes all addon systems.
 */
import { world, system, EntityTypes } from "@minecraft/server";
import { initializeTracker } from "./modules/entity-manager";
import { initializeConversationHandler } from "./modules/conversation";
import { initializePlayerPreviewSystem } from "./modules/player-build-preview";
import {
  ensureWaitingBoxTickingArea,
  log,
  randomColor,
} from "./utils";
import { initializeInitialSpawnHandler } from "./modules/initial-spawn-handler";
import { randomVillagerName } from "./modules/random-name-generator";

initializeTracker({ entityType: "minecraft:villager", runInterval: 100 });
initializeConversationHandler();
initializePlayerPreviewSystem(world);
ensureWaitingBoxTickingArea(world);
initializeInitialSpawnHandler();

// --- World Load Event: Set flags AND Name Existing Villagers ---
world.afterEvents.worldLoad.subscribe(() => {
  // Log that the addon script has loaded successfully.
  log("Mobs&Mates addon loaded successfully.");

  // --- Part 1: Initial World Spawn Flag ---
  // Check if the one-time world initialization flag has already been set.
  if (world.getDynamicProperty("mm:world_has_initial_spawned") === undefined) {
    log("First world load detected. Setting initial spawn flag.");
    // If the flag is not set, set it now. This prevents the initial villager spawn logic
    // (triggered by playerSpawn events) from potentially running multiple times across script reloads.
    world.setDynamicProperty("mm:world_has_initial_spawned", true);
    log("World initial spawn flag set.");
  } else {
    // If the flag already exists, log that initialization was previously done.
    log("World already initialized regarding initial spawn flag.");
  }

  // --- Part 2: Name Existing Nameless Villagers ---
  // Use a timeout to ensure most entities have loaded into the world before scanning.
  const initialScanDelay = 100; // Delay in ticks (5 seconds)
  log(
    `[Namer] Starting scan for existing unnamed villagers in ${initialScanDelay} ticks...`
  );

  system.runTimeout(() => {
    log("[Namer] Scanning now...");
    try {
      // Get the overworld dimension. Add loops for other dimensions if needed.
      const overworld = world.getDimension("overworld");

      // Get all currently loaded villagers (both V1 and V2 types).
      const villagersV1 = overworld.getEntities({ type: "minecraft:villager" });
      const villagersV2 = overworld.getEntities({
        type: "minecraft:villager_v2",
      });
      // Combine the results into a single array.
      const existingVillagers = [...villagersV1, ...villagersV2];

      let potentialToNameCount = 0; // Count how many might need naming.

      // Iterate through all found villagers.
      for (const entity of existingVillagers) {
        // Check if the entity is valid and does NOT already have a name tag assigned.
        if (entity && entity.isValid && !entity.nameTag) {
          potentialToNameCount++; // Increment count of villagers needing names.
          // Use another very short timeout for each villager.
          // This prevents potential performance hitches if many villagers are named at once
          // and ensures components are fully available.
          system.runTimeout(() => {
            try {
              // Double-check validity inside the timeout.
              if (!entity || !entity.isValid || entity.nameTag) return; // Exit if invalid or already named by now.

              // Generate a base name using your random name function.
              // Attempt to get a profession key (e.g., variant index) for potential name variation.
              const professionKey =
                entity
                  .getComponent("minecraft:villager")
                  ?.variant?.toString() ?? "none";
              const baseName = randomVillagerName(professionKey);

              // Generate a single random color code.
              const chatColor = randomColor();
              // Combine the color code and the base name.
              const finalName = chatColor + baseName;

              // Apply the colored name tag to the villager.
              entity.nameTag = finalName;
              // Store the chosen color code as a dynamic property for later use in chat messages.
              entity.setDynamicProperty("mm:chat_color", chatColor);

              // Log the successful naming. Use §r to reset color in log if needed.
              log(
                `[Namer] Assigned name "${finalName}§r" and color ${chatColor} to existing villager (ID: ${entity.id})`
              );

              // Optional: Add a tag for easy targeting later.
              entity
                .runCommand(`tag @s add named_by_script`)
                .catch((e) => log(`[Namer] Failed to add tag: ${e}`));
            } catch (e) {
              // Log errors occurring during the naming process for a specific villager.
              log(
                `[Namer] Error applying name tag to existing villager ${entity?.id}: ${e}`
              );
            }
          }, 1); // 1 tick delay for safety.
        }
      } // End of villager loop.

      // Log summary after initiating all naming timeouts.
      log(
        `[Namer] Finished scan. Initiated naming process for ${potentialToNameCount} existing villagers.`
      );
    } catch (err) {
      // Catch errors during the entity query phase.
      log(
        `[Namer] Error during scan for existing villagers: ${err}\n${err.stack}`
      );
    }
  }, initialScanDelay); // Execute the scan after the initial delay.
});

// --- Entity Spawn Event: Name Villagers ---
world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  // Check if the spawned entity is specifically a Villager
  if (entity.typeId.startsWith("minecraft:villager")) {
    // Use === for strict comparison
    system.runTimeout(() => {
      try {
        if (!entity || !entity.isValid) return;

        // Check if the villager already has a name tag
        if (entity.nameTag) {
          log(
            `[Namer] Villager (ID: ${entity.id}) already had nameTag: "${entity.nameTag}". Skipping automatic naming.`
          );
          // Ensure existing villagers also have a color property if missing
          if (entity.getDynamicProperty("mm:chat_color") === undefined) {
            const existingColor = randomColor(); // Assign a color anyway
            entity.setDynamicProperty("mm:chat_color", existingColor);
            log(
              `[Namer] Assigned fallback chat color ${existingColor} to pre-named villager ${entity.nameTag}`
            );
          }
          return;
        }

        // Generate base name
        const professionKey =
          entity.getComponent("minecraft:villager")?.variant?.toString() ??
          "none";
        const baseName = randomVillagerName(professionKey); // Get the plain name

        // --- Generate and Apply ONE Color ---
        const chatColor = randomColor(); // Generate one color code (e.g., "§a")
        const finalName = chatColor + baseName; // Prepend color to the name

        // Apply the colored name tag
        entity.nameTag = finalName;
        // Store the chosen color code separately
        entity.setDynamicProperty("mm:chat_color", chatColor);
        // --- End of Color Logic ---

        log(
          `[Namer] Assigned name "${finalName}§r" and color ${chatColor} to new villager (ID: ${entity.id}, ProfessionKey: ${professionKey})`
        );

        // Add a tag for potential future use
        try {
          entity.runCommand(`gamerule sendCommandFeedback false`);
          entity.runCommand(`tag @s add named_by_script`);
        } catch (e) {
          log(`[Namer] Error running commands on villager: ${e}`);
        }
      } catch (e) {
        log(`[Namer] Error applying name tag: ${e}\n${e.stack}`);
      }
    }, 1); // Delay of 1 tick
  }
});
console.log("[Mobs&Mates]] Systems loaded. ✅");
