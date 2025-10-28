/**
 * @file Handles the execution of villager actions, such as mining or hunting.
 */

import {
  world,
  system,
  EntityComponentTypes,
  BlockPermutation,
} from "@minecraft/server";
import {
  distanceSquared,
  log,
  randomFrom,
  sendVillagerMessage,
} from "../utils";
import {
  actionDetails,
  actionTimes,
  DEBUG,
  VILLAGER_SEARCH_RADIUS,
  waitingBoxCoords,
} from "../config/villager-config";
import { t } from "./translator";

/**
 * Calculates the loot an entity gets based on action and duration.
 * @param {string} actionName The name of the action.
 * @param {number} durationMinutes The time spent on the action.
 * @returns {Array<{item: string, quantity: number}>}
 */
function calculateLoot(actionName, durationMinutes) {
  log(
    `§8[Loot] Calculating loot for '${actionName}' (${durationMinutes} min)...§r`
  );
  const details = actionDetails[actionName];
  if (!details) return [];

  const rewards = [];
  for (const item of details.loot_table) {
    // For each "time factor" unit, the villager gets one chance to find the item.
    const chances = DEBUG ? 1 : Math.floor(durationMinutes / item.time_factor);
    if (chances <= 0) continue;

    let totalQuantity = 0;
    for (let i = 0; i < chances; i++) {
      // 75% success rate for each chance.
      if (Math.random() < 0.75) {
        totalQuantity +=
          Math.floor(Math.random() * (item.max_qty - item.min_qty + 1)) +
          item.min_qty;
      }
    }

    if (totalQuantity > 0) {
      log(`§e[Loot] -> Found ${totalQuantity} of ${item.item}§r`);
      rewards.push({ item: item.item, quantity: totalQuantity });
    }
  }
  return rewards;
}

/**
 * Finds a safe location near a starting point for the entity to spawn.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} startLocation
 * @param {number} minDistance
 * @param {number} maxDistance
 * @returns {import("@minecraft/server").Vector3 | null}
 */
function findSafeLocation(dimension, startLocation, minDistance, maxDistance) {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * (maxDistance - minDistance) + minDistance;
    const x = Math.floor(startLocation.x + distance * Math.cos(angle));
    const z = Math.floor(startLocation.z + distance * Math.sin(angle));

    for (let yOffset = 5; yOffset > -15; yOffset--) {
      const y = Math.floor(startLocation.y) + yOffset;
      try {
        const blockBelow = dimension.getBlock({ x, y: y - 1, z });
        if (!blockBelow || !blockBelow.isSolid) continue;

        const headBlock = dimension.getBlock({ x, y, z });
        const skyBlock = dimension.getBlock({ x, y: y + 1, z });
        if (headBlock?.isSolid || skyBlock?.isSolid) continue;

        return { x, y, z };
      } catch (e) {
        /* Location is outside of the loaded world, ignore */
      }
    }
  }
  return null;
}

/**
 * Starts the full action cycle for a villager.
 * @param {object} villagerData The villager's state object.
 * @param {object} action The classified action intent.
 * @param {import("@minecraft/server").Player} player The player who initiated the action.
 */
export function startAction(villagerData, action, player) {
  const entity = villagerData?.entity;
  if (!entity || !entity.isValid) {
    log(
      `[Action][Error] startAction aborted: Entity ${
        villagerData?.entity?.id ?? "N/A"
      } invalid.`
    );
    if (villagerData) villagerData.busy = false;
    return;
  }

  const villagerId = entity.id;
  villagerData.busy = true;

  const actionName = action?.intent;
  if (!actionName) {
    log(
      `[Action][Error] startAction aborted for ${entity.nameTag}: Action intent missing.`
    );
    villagerData.busy = false;
    return;
  }

  const details = actionDetails[actionName];
  const timings = actionTimes[actionName];
  if (!details || !timings || !Array.isArray(timings) || timings.length === 0) {
    log(
      `[Action][Error] Aborted: Config details or timings invalid/missing for action '${actionName}'.`
    );
    sendVillagerMessage(player, entity, "error_action_misconfigured", [
      actionName,
    ]);
    villagerData.busy = false;
    return;
  }

  const chosenTime = randomFrom(timings);
  if (chosenTime === undefined || isNaN(chosenTime)) {
    log(
      `[Action][Error] Aborted: Invalid chosenTime (${chosenTime}) for action '${actionName}'.`
    );
    sendVillagerMessage(player, entity, "error_action_misconfigured", [
      actionName,
    ]);
    villagerData.busy = false;
    return;
  }

  const formattedName = entity.nameTag;
  log(
    `[Action] ${formattedName} starting '${actionName}' for ${chosenTime} mins.`
  );

  // --- Send preparation message specific to action ---
  sendVillagerMessage(player, entity, `action_prepare_${actionName}`, [
    formattedName,
  ]);

  // --- Equip Tool if needed ---
  if (details.tool) {
    try {
      const equippable = entity.getComponent(EntityComponentTypes.Equippable);
      if (equippable) {
        equippable.setEquipment(
          EquipmentSlot.Mainhand,
          new ItemStack(details.tool, 1)
        );
      } else {
        log(
          `[Action][Warn] Equippable component not found on ${formattedName}. Cannot equip tool.`
        );
      }
    } catch (e) {
      log(`[Action][Error] Equipping tool failed for ${formattedName}: ${e}`);
    }
  }

  // --- Go Away Phase ---
  system.runTimeout(() => {
    const currentEntity = world.getEntity(villagerId);
    if (!currentEntity || !currentEntity.isValid) {
      log(
        `[Action][Warn] Entity ${villagerId} became invalid during prep time.`
      );
      villagerData.busy = false;
      return;
    }

    // Send departure message
    sendVillagerMessage(player, currentEntity, "action_start", [
      formattedName,
      String(chosenTime),
    ]);

    currentEntity.teleport(waitingBoxCoords);
    const invisibilityDuration = chosenTime * 60 * 20 + 100;
    currentEntity.addEffect("invisibility", invisibilityDuration, {
      showParticles: false,
    });

    // --- Wait and Return Phase ---
    const taskDurationTicks = DEBUG ? 100 : chosenTime * 60 * 20;
    system.runTimeout(() => {
      const returningEntity = world.getEntity(villagerId);
      if (!returningEntity || !returningEntity.isValid) {
        log(`[Action][Error] Entity ${villagerId} became invalid during task.`);
        villagerData.busy = false;
        return;
      }

      const currentFormattedName = returningEntity.nameTag;

      // Teleport back safely
      const spawnLocation = findSafeLocation(
        player.dimension,
        player.location,
        5,
        10
      );
      const finalSpawnLoc = spawnLocation
        ? { x: spawnLocation.x, y: spawnLocation.y, z: spawnLocation.z }
        : {
            x: player.location.x,
            y: player.location.y + 0.5,
            z: player.location.z,
          };
      returningEntity.teleport(finalSpawnLoc);
      returningEntity.removeEffect("invisibility");

      // --- Handle results ---
      if (details.reward_type === "structure_location") {
        const structureToFind = randomFrom(details.loot_table);
        try {
          const result = returningEntity.dimension.runCommand(
            `locate structure ${structureToFind}`
          );
          const coordsMatch = result.statusMessage.match(/-?\d+/g);
          if (coordsMatch && coordsMatch.length >= 3) {
            const [x, y, z] = coordsMatch;
            const structureNameKey = `structure_${structureToFind}`;
            const coordsString = `X: ${x}, Y: ${y}, Z: ${z}`;
            sendVillagerMessage(
              player,
              returningEntity,
              "explore_report_location_success",
              [formattedName, structureNameKey, coordsString]
            );
          } else {
            sendVillagerMessage(
              player,
              returningEntity,
              "explore_report_location_fail",
              [formattedName]
            );
          }
        } catch (e) {
          sendVillagerMessage(
            player,
            returningEntity,
            "explore_report_location_fail",
            [formattedName]
          );
          log(`[Action][Error] /locate command failed: ${e}`);
        }
      } else {
        const loot = calculateLoot(actionName, chosenTime);
        if (loot.length > 0) {
          sendVillagerMessage(
            player,
            returningEntity,
            `action_return_success_${actionName}`,
            [formattedName]
          );
          try {
            player.dimension.runCommand(`gamerule sendCommandFeedback false`);
            for (const reward of loot) {
              player.dimension.runCommand(
                `give "${player.name}" ${reward.item} ${reward.quantity}`
              );
            }
            player.dimension.runCommand(`gamerule sendCommandFeedback true`);
          } catch (giveError) {
            log(`[Action][Error] Giving items failed: ${giveError}`);
          }
        } else {
          sendVillagerMessage(player, returningEntity, "action_return_fail", [
            formattedName,
          ]);
        }
      }

      // --- Clean up ---
      try {
        const equippable = returningEntity.getComponent(
          EntityComponentTypes.Equippable
        );
        if (equippable)
          equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
      } catch (e) {}

      villagerData.busy = false;
      log(
        `[Action] ${currentFormattedName} (ID: ${villagerId}) finished task and is free.`
      );
    }, taskDurationTicks);
  }, 100);
}

/**
 * Placeholder for the "raid" action. This is a complex, real-time combat event.
 * @param {object} villagerData The villager's state object.
 * @param {import("@minecraft/server").Player} player The player who initiated the action.
 */
export function handleRaidAction(villagerData, player) {
  const entity = villagerData.entity;
  if (!entity || !entity.isValid) return;

  villagerData.busy = true;
  player.sendMessage(
    `<${entity.nameTag}> Okay, I will defend the area! (Raid logic not yet implemented)`
  );
  log(
    `[Action] Raid action triggered for ${entity.nameTag}. This feature is a work in progress.`
  );

  // TODO: Implement raid logic here (e.g., spawn mobs, make villager fight).

  // For now, just make the villager free again after a short time.
  system.runTimeout(() => {
    villagerData.busy = false;
    player.sendMessage(`<${entity.nameTag}> The area is secure for now.`);
  }, 200); // 10 seconds
}
/**
 * Handles the "come here" action by teleporting the villager near the player.
 * @param {object} villagerData The villager's state object.
 * @param {import("@minecraft/server").Player} player The player to teleport to.
 */
export function handleComeHereAction(villagerData, player) {
  const entity = villagerData.entity;
  // Exit if the entity is invalid
  if (!entity || !entity.isValid) return;

  // Set the villager to busy to prevent other commands
  villagerData.busy = true;

  // Let the player know the command was understood
  player.sendMessage(t(player, "action_come_here_ack", entity.nameTag));
  log(`[Action] ${entity.nameTag} will teleport to ${player.name}.`);

  // Use a short timeout to make the teleport feel less instant and more deliberate
  system.runTimeout(() => {
    try {
      // Re-check if the entity and player are still valid after the delay
      if (!entity.isValid || !player.isValid) {
        villagerData.busy = false;
        return;
      }

      // Find a safe spot 2 to 4 blocks away from the player
      const safeLocation = findSafeLocation(
        player.dimension,
        player.location,
        2,
        4
      );

      // Teleport the villager to the safe location.
      // If no safe spot is found, teleport to the player's exact location as a fallback.
      entity.teleport(safeLocation || player.location);

      // Let the player know the villager has arrived
      player.sendMessage(t(player, "action_come_here_done", entity.nameTag));

      // The action is complete, so set the villager to not busy
      villagerData.busy = false;
      log(`[Action] ${entity.nameTag} has successfully teleported.`);
    } catch (e) {
      villagerData.busy = false;
      log(`[Action] Error during 'come_here' teleport: ${e}`);
    }
  }, 40); // 2-second delay (40 ticks)
}

/**
 * Handles the "build" action. Villager searches for a clear foundation
 * and instantly loads the corresponding structure, destroying the foundation block.
 * @param {object} villagerData Villager's state object.
 * @param {object} action Classified action intent (e.g., { intent: "build_house" }).
 * @param {import("@minecraft/server").Player} player Initiating player.
 */
export function handleBuildAction(villagerData, action, player) {
  // Get the villager entity from the data object
  const entity = villagerData.entity;
  // Exit if the entity is invalid (e.g., unloaded or dead)
  if (!entity || !entity.isValid) {
    log("[Build] handleBuildAction stopped: Entity invalid.");
    return;
  }

  // Mark the villager as busy during search and build process
  villagerData.busy = true;
  const formattedName = entity.nameTag;
  const dimension = entity.dimension;
  log(`[Build] Instant build action started for ${formattedName}.`);

  // Find the specific build configuration based on the matched intent name
  const buildConfig = actionDetails.build.find(
    (b) => b.intent_name === action.intent
  );

  // If no config found for this specific build action
  if (!buildConfig) {
    log(`[Build] Config not found for intent '${action.intent}'.`);
    player.sendMessage({
      translate: "action_build_fail_config",
      with: [formattedName],
    });
    villagerData.busy = false; // Free the villager
    return;
  }

  log(
    `[Build] ${formattedName} searching for ${buildConfig.foundation_block} within ${VILLAGER_SEARCH_RADIUS} blocks.`
  );

  let closestClearFoundation = null; // Stores {x, y, z} of the best location
  let minDistanceSq = Infinity; // Tracks the squared distance to the closest
  let foundAnyFoundation = false; // Tracks if any matching foundation was found

  const villagerLoc = entity.location;
  // Define search boundaries
  const searchMin = {
    x: Math.floor(villagerLoc.x - VILLAGER_SEARCH_RADIUS),
    y: Math.floor(villagerLoc.y - 5),
    z: Math.floor(villagerLoc.z - VILLAGER_SEARCH_RADIUS),
  };
  const searchMax = {
    x: Math.floor(villagerLoc.x + VILLAGER_SEARCH_RADIUS),
    y: Math.floor(villagerLoc.y + 5),
    z: Math.floor(villagerLoc.z + VILLAGER_SEARCH_RADIUS),
  };

  log(
    `[Build] Search Bounds: X(${searchMin.x} to ${searchMax.x}), Y(${searchMin.y} to ${searchMax.y}), Z(${searchMin.z} to ${searchMax.z})`
  );

  // --- Search Loop ---
  try {
    log("[Build] Entering search loops...");
    // Iterate through the defined search volume
    for (let x = searchMin.x; x <= searchMax.x; x++) {
      for (let y = searchMin.y; y <= searchMax.y; y++) {
        for (let z = searchMin.z; z <= searchMax.z; z++) {
          const blockCoords = { x: x, y: y, z: z };
          let block = null;
          try {
            block = dimension.getBlock(blockCoords);
          } catch (getBlockError) {
            continue;
          } // Ignore errors from unloaded chunks

          // If the block matches the required foundation type
          if (block?.typeId === buildConfig.foundation_block) {
            foundAnyFoundation = true;
            const foundationPos = { x: x, y: y, z: z };
            // Check the area *above* the foundation block
            const areaToCheckStart = { x: x, y: y + 1, z: z };
            // Size to check is the structure height minus the foundation layer itself
            const areaSize = {
              x: buildConfig.structure_size.x,
              y: buildConfig.structure_size.y - 1,
              z: buildConfig.structure_size.z,
            };

            // If the area above is clear
            if (checkAreaClear(dimension, areaToCheckStart, areaSize)) {
              // Calculate distance from villager to this foundation
              const foundationCenter = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
              const distSq = distanceSquared(villagerLoc, foundationCenter);
              // If this is the closest clear foundation found so far
              if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                closestClearFoundation = foundationPos; // Update the best location
              }
            }
          }
        } // z
      } // y
    } // x
    log("[Build] Finished search loops.");
  } catch (e) {
    log(`[Build] MAJOR ERROR during search loop execution: ${e}\n${e.stack}`);
  }

  // --- Result of Search ---
  // If a suitable location was found
  if (closestClearFoundation) {
    log(
      `[Build] Found suitable foundation at ${JSON.stringify(
        closestClearFoundation
      )}. Proceeding with instant build.`
    );
    const structureName = buildConfig.structure_name;
    // const originalFoundationId = buildConfig.foundation_block; // No longer needed
    const buildLocation = closestClearFoundation;

    // Use a short timeout to allow messages to send before potential lag from structure load
    system.runTimeout(() => {
      try {
        // Remove the foundation block BEFORE loading the structure
        player.sendMessage({
          translate: "action_build_start",
          with: [
            formattedName,
            structureName,
            String(buildLocation.x),
            String(buildLocation.y),
            String(buildLocation.z),
          ],
        });
        dimension.setBlockPermutation(
          buildLocation,
          BlockPermutation.resolve("minecraft:air")
        );
        log(
          `[Build] Foundation block at ${buildLocation.x},${buildLocation.y},${buildLocation.z} removed.`
        );

        // Load the structure INSTANTLY
        dimension.runCommand(
          `structure load ${structureName} ${buildLocation.x} ${buildLocation.y} ${buildLocation.z}`
        );
        log(
          `[Build] Structure ${structureName} loaded at ${buildLocation.x},${buildLocation.y},${buildLocation.z}`
        );
        // Send success message using native translation
        player.sendMessage({
          translate: "build_success",
          with: [formattedName, structureName],
        });

        villagerData.busy = false; // Free the villager
      } catch (e) {
        // Catch errors during the structure load or block setting
        log(
          `[Build] Error during structure load or foundation removal: ${e}\n${e.stack}`
        );
        player.sendMessage({
          translate: "action_build_fail_error",
          with: [formattedName],
        });
        // Attempt to clear the foundation location even on error
        try {
          dimension.setBlockPermutation(
            buildLocation,
            BlockPermutation.resolve("minecraft:air") // Try setting to air again
          );
        } catch {}
        villagerData.busy = false; // Free the villager
      }
    }, 20); // 1-second delay (20 ticks) before executing the build
  } else {
    // If no suitable foundation was found
    log(
      `[Build] No suitable foundation found. foundAnyFoundation=${foundAnyFoundation}`
    );
    if (foundAnyFoundation) {
      // If foundations were found, but none were clear above
      player.sendMessage({
        translate: "action_build_fail_obstructed",
        with: [formattedName],
      });
    } else {
      // If no foundation blocks of the correct type were found at all
      player.sendMessage({
        translate: "action_build_fail_no_foundation",
        with: [formattedName],
      });
    }
    villagerData.busy = false; // Free the villager
  }
}

/**
 * Checks if a cubic area starting from a location is clear of solid obstructions.
 * Ignores specific preview/foundation blocks.
 * @param {import("@minecraft/server").Dimension} dimension The dimension to check in.
 * @param {import("@minecraft/server").Vector3} startLocation The starting corner (min coords) of the area.
 * @param {import("@minecraft/server").Vector3} size The size (X, Y, Z) of the area to check.
 * @returns {boolean} True if the area is clear, false otherwise.
 */
export function checkAreaClear(dimension, startLocation, size) {
  // List of block IDs that should NOT count as obstructions
  const passablePreviewBlocks = [
    "mm:green_block_preview",
    "mm:red_block_preview",
    "mm:ground_house_placer", // Add any other foundation block IDs here
    // "mm:barracks_placer",
  ];

  try {
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          const checkPos = {
            x: startLocation.x + x,
            y: startLocation.y + y,
            z: startLocation.z + z,
          };
          const block = dimension.getBlock(checkPos);

          // If the block exists...
          if (block) {
            // Check if it's NOT air AND NOT liquid AND NOT one of our passable preview/foundation blocks
            if (
              !block.isAir &&
              !block.isLiquid &&
              !passablePreviewBlocks.includes(block.typeId)
            ) {
              return false; // Obstructed by a solid block
            }
          }
          // If block is undefined (outside world load), treat as obstructed? Or clear? Let's assume clear for now.
        }
      }
    }
    return true; // Area is clear
  } catch (e) {
    log(`[Build Check] Error checking area: ${e}`, undefined);
    return false; // Assume obstructed on error
  }
}
