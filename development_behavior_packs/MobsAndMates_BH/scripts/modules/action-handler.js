// modules/action-handler.js

/**
 * @file Handles the execution of villager actions, such as mining or hunting.
 */

import {
  world,
  system,
  EntityComponentTypes,
  //ItemStack,
  //EntityComponentTypes,
  //EquipmentSlot,
} from "@minecraft/server";
import { log, randomFrom } from "../utils";
import {
  actionDetails,
  actionTimes,
  DEBUG,
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
  if (!villagerData.entity || !villagerData.entity.isValid) return;

  const villagerId = villagerData.entity.id;
  villagerData.busy = true;

  const actionName = action.intent;
  const details = actionDetails[actionName];
  const chosenTime = randomFrom(actionTimes[actionName]);
  const formattedName = villagerData.entity.nameTag;
  const translationKey = `action_prepare_${actionName}`; // ex: "action_prepare_mine"


  player.sendMessage(t(player, translationKey, formattedName));
  log(
    `[Action] ${formattedName} is starting '${actionName}' for ${chosenTime} minutes.`
  );

  if (details.tool) {
    try {
      const equippable = villagerData.entity.getComponent(
        EntityComponentTypes.Equippable
      );
      equippable.setEquipment(
        EquipmentSlot.Mainhand,
        new ItemStack(details.tool, 1)
      );
    } catch (e) {
      log(`[Action] Could not equip tool on ${formattedName}.`);
    }
  }

  system.runTimeout(() => {
    const entity = world.getEntity(villagerId);
    if (!entity || !entity.isValid) {
      villagerData.busy = false;
      return;
    }

    player.sendMessage(t(player, "action_start", formattedName, chosenTime));
    entity.teleport(waitingBoxCoords);
    entity.addEffect("invisibility", chosenTime * 60 * 20 + 100, {
      showParticles: false,
    });

    system.runTimeout(
      async () => {
        const returningEntity = world.getEntity(villagerId);
        if (!returningEntity || !returningEntity.isValid) {
          villagerData.busy = false;
          return;
        }

        const spawnLocation = findSafeLocation(
          player.dimension,
          player.location,
          5,
          10
        );
        returningEntity.teleport(spawnLocation || player.location);
        returningEntity.removeEffect("invisibility");

        if (details.reward_type === "structure_location") {
          const structureToFind = randomFrom(details.loot_table);
          log(
            `[Explore] ${formattedName} is searching for a ${structureToFind}.`
          );

          try {
            const result = await player.dimension.runCommand(
              `locate structure ${structureToFind}`
            );

            if (result.successCount > 0) {
              const coordsMatch = result.statusMessage.match(/-?\d+/g);
              if (coordsMatch && coordsMatch.length >= 3) {
                const [x, y, z] = coordsMatch;
                const structureName = t(player, `structure_${structureToFind}`);
                const coordsString = `X: ${x}, Y: ${y}, Z: ${z}`;
                player.sendMessage(
                  t(
                    player,
                    "explore_report_location_success",
                    formattedName,
                    structureName,
                    coordsString
                  )
                );
              }
            } else {
              player.sendMessage(
                t(player, "explore_report_location_fail", formattedName)
              );
            }
          } catch (e) {
            player.sendMessage(
              t(player, "explore_report_location_fail", formattedName)
            );
            log(`[Explore] /locate command failed: ${e}`);
          }
        } else {
          const loot = calculateLoot(actionName, chosenTime);
          if (loot.length > 0) {
            player.sendMessage(
              t(player, "action_return_success", formattedName, actionName)
            );
            for (const reward of loot) {
              player.dimension.runCommand(`gamerule sendCommandFeedback false`);
              player.dimension.runCommand(
                `give "${player.name}" ${reward.item} ${reward.quantity}`
              );
              player.dimension.runCommand(`gamerule sendCommandFeedback true`);
            }
          } else {
            player.sendMessage(t(player, "action_return_fail", formattedName));
          }
        }

        try {
          const equippable = returningEntity.getComponent(
            EntityComponentTypes.Equippable
          );
          equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
        } catch (e) {}

        villagerData.busy = false;
        log(`[Action] ${formattedName} has finished the task and is now free.`);
      },
      DEBUG ? 100 : chosenTime * 60 * 20
    );
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
