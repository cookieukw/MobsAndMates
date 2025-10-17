// modules/action-handler.js

/**
 * @file Handles the execution of villager actions, such as mining or hunting.
 */

import {
  world,
  system,
  ItemStack,
  EntityComponentTypes,
  EquipmentSlot,
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

  player.sendMessage(t(player, "action_prepare", formattedName, actionName));
  log(
    `[Action] ${formattedName} is starting '${actionName}' for ${chosenTime} minutes.`
  );

/*   // Phase 1: Preparation (equip tool)
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
  } */

  system.runTimeout(() => {
    const entity = world.getEntity(villagerId);
    if (!entity || !entity.isValid) {
      villagerData.busy = false;
      return;
    }

    // Phase 2: Working (teleport away and become invisible)
    player.sendMessage(t(player, "action_start", formattedName, chosenTime));
    entity.teleport(waitingBoxCoords);
    entity.addEffect("invisibility", chosenTime * 60 * 20 + 100, {
      showParticles: false,
    });

    system.runTimeout(
      () => {
        const returningEntity = world.getEntity(villagerId);
        if (!returningEntity || !returningEntity.isValid) {
          villagerData.busy = false;
          return;
        }

        // Phase 3: Return and deliver loot
        const loot = calculateLoot(actionName, chosenTime);
        const spawnLocation = findSafeLocation(
          player.dimension,
          player.location,
          5,
          10
        );

        returningEntity.teleport(spawnLocation || player.location);
        returningEntity.removeEffect("invisibility");

        log(
          `[Action] ${formattedName} has returned. Loot: ${JSON.stringify(
            loot
          )}`
        );

        if (loot.length > 0) {
          // Caso de sucesso: envia a mensagem de sucesso e os itens.
          player.sendMessage(
            t(player, "action_return_success", formattedName, actionName)
          );
          log(
            `[Action] ${formattedName} has returned. Loot: ${JSON.stringify(
              loot
            )}`
          );
          for (const reward of loot) {
            player.dimension.runCommand(
              `give "${player.name}" ${reward.item} ${reward.quantity}`
            );
          }
        } else {
          // Caso de falha: envia a mensagem de falha.
          player.sendMessage(t(player, "action_return_fail", formattedName));
          log(`[Action] ${formattedName} has returned, but found no loot.`);
        }

     /*    // Clear equipment and finish
        try {
          const equippable = returningEntity.getComponent(
            EntityComponentTypes.Equippable
          );
          equippable.setEquipment(EquipmentSlot.Mainhand);
        } catch (e) {}
 */
        villagerData.busy = false;
        log(`[Action] ${formattedName} has finished the task and is now free.`);
      },
      DEBUG ? 100 : chosenTime * 60 * 20
    ); // Use short time in debug mode
  }, 100); // 5 second prep time
}
