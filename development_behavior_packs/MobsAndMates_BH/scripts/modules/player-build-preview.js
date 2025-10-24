// modules/player-build-preview.js
/**
 * @file Manages the player-driven structure preview system
 * using entity markers for persistence.
 */
import { world, system, BlockPermutation } from "@minecraft/server";
import { checkAreaClear } from "./action-handler";
import { actionDetails } from "../config/villager-config";
import { log } from "../utils";

// ID of our marker entity
const MARKER_ENTITY_ID = "mm:build_marker";

// Only declare the variables here. Do not call BlockPermutation.resolve().
let PREVIEW_GREEN;
let PREVIEW_RED;
let AIR;

/**
 * Remove preview blocks (red/green) from an area.
 */
function cleanupPreviewBlocks(dimension, foundationLoc, structureSize) {
  log(
    `[Player Build] Cleaning up preview blocks around ${JSON.stringify(
      foundationLoc
    )}`
  );
  try {
    for (let x = 0; x < structureSize.x; x++) {
      for (let y = 1; y < structureSize.y; y++) {
        // Start above foundation
        for (let z = 0; z < structureSize.z; z++) {
          const currentPos = {
            x: foundationLoc.x + x,
            y: foundationLoc.y + y,
            z: foundationLoc.z + z,
          };
          const block = dimension.getBlock(currentPos);
          if (
            block &&
            (block.typeId === "mm:green_block_preview" ||
              block.typeId === "mm:red_block_preview")
          ) {
            // The AIR variable will be defined before this function is called
            dimension.setBlockPermutation(currentPos, AIR);
          }
        }
      }
    }
  } catch (e) {
    log(`[Player Build] Error during cleanup: ${e}`);
  }
}

/**
 * Main loop that updates the visual previews (red/green).
 * It now iterates over the marker entities.
 */
function updatePlayerPreviews() {
  const dimension = world.getDimension("overworld");

  // Get ALL build marker entities in the world
  for (const entity of dimension.getEntities({ type: MARKER_ENTITY_ID })) {
    const foundationLoc = entity.location;

    // Get the saved data FROM THE ENTITY
    const structureName = entity.getDynamicProperty("structureName");
    const sizeX = entity.getDynamicProperty("structureSizeX");
    const sizeY = entity.getDynamicProperty("structureSizeY");
    const sizeZ = entity.getDynamicProperty("structureSizeZ");
    const foundationBlockId = entity.getDynamicProperty("foundationBlockId");

    // If any property is missing, remove the entity
    if (!structureName || !sizeX || !sizeY || !sizeZ || !foundationBlockId) {
      log(
        `[Player Build] Marker entity at ${JSON.stringify(
          foundationLoc
        )} has missing data. Removing.`
      );
      entity.kill();
      continue;
    }

    const structureSize = { x: sizeX, y: sizeY, z: sizeZ };

    try {
      const foundationBlock = dimension.getBlock(foundationLoc);

      // SELF-HEALING: If the foundation block is no longer there (e.g., explosion),
      // clean up the preview blocks and kill the marker entity.
      if (!foundationBlock || foundationBlock.typeId !== foundationBlockId) {
        log(
          `[Player Build] Foundation missing/changed for marker at ${JSON.stringify(
            foundationLoc
          )}. Cleaning up.`
        );
        cleanupPreviewBlocks(dimension, foundationLoc, structureSize);
        entity.kill();
        continue;
      }

      // --- Rendering logic (same as before) ---
      const areaToCheckStart = {
        x: foundationLoc.x,
        y: foundationLoc.y + 1,
        z: foundationLoc.z,
      };
      const areaSize = { x: sizeX, y: sizeY - 1, z: sizeZ };
      const isClear = checkAreaClear(dimension, areaToCheckStart, areaSize);

      // Save the 'isClear' state on the entity for 'playerInteract' to read
      entity.setDynamicProperty("isClear", isClear);

      // The PREVIEW_GREEN/PREVIEW_RED variables will be defined before this function is called
      const targetPreviewPermutation = isClear ? PREVIEW_GREEN : PREVIEW_RED;
      const otherPreviewBlockId = isClear
        ? "mm:red_block_preview"
        : "mm:green_block_preview";

      for (let x = 0; x < sizeX; x++) {
        for (let y = 1; y < sizeY; y++) {
          for (let z = 0; z < sizeZ; z++) {
            const currentPos = {
              x: foundationLoc.x + x,
              y: foundationLoc.y + y,
              z: foundationLoc.z + z,
            };
            try {
              const currentBlock = dimension.getBlock(currentPos);
              // If the block is air OR the wrong preview color, update it
              if (
                currentBlock &&
                (currentBlock.isAir ||
                  currentBlock.typeId === otherPreviewBlockId)
              ) {
                dimension.setBlockPermutation(
                  currentPos,
                  targetPreviewPermutation
                );
              }
            } catch (setBlockError) {
              // Fail silently if a single block fails to set
            }
          }
        }
      }
    } catch (e) {
      log(
        `[Player Build] Error updating preview fill at ${JSON.stringify(
          foundationLoc
        )}: ${e}`
      );
      cleanupPreviewBlocks(dimension, foundationLoc, structureSize);
      entity.kill(); // Kill marker on error
    }
  }
}

/**
 * Gets the marker entity at a specific location.
 * @returns {import("@minecraft/server").Entity | undefined}
 */
function getMarkerEntityAt(dimension, location) {
  const entities = dimension.getEntities({
    type: MARKER_ENTITY_ID,
    location: location,
    maxDistance: 0.5, // Get only entities at the block's center
  });
  return entities[0];
}

/**
 * Initializes the player preview system.
 */
export function initializePlayerPreviewSystem(world) {
  log("[Player Build System] Initializing (Entity-Based)...");

  // Initialize the permutations here, inside the initialization function.
  // It's now safe to call the API.
  system.run(() => {
    PREVIEW_GREEN = BlockPermutation.resolve("mm:green_block_preview");
    PREVIEW_RED = BlockPermutation.resolve("mm:red_block_preview");
    AIR = BlockPermutation.resolve("minecraft:air");

    log("[Player Build System] Block permutations resolved.");
  });

  // --- Event: Player Places Foundation Block ---
  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { player, block } = event;
    const blockId = block.typeId;
    const dimension = player.dimension;
    // Find the build config matching the placed block
    const buildConfig = actionDetails.build.find(
      (b) => b.foundation_block === blockId
    );

    if (buildConfig) {
      const foundationLoc = block.location;
      log(
        `[Player Build] Foundation placed: ${blockId} at ${JSON.stringify(
          foundationLoc
        )} by ${player.name}`
      );

      // Clean up any old marker that might be there
      const oldMarker = getMarkerEntityAt(dimension, foundationLoc);
      if (oldMarker) {
        oldMarker.kill();
      }

      // Spawn the new marker entity
      const marker = dimension.spawnEntity(MARKER_ENTITY_ID, foundationLoc);

      // Save the data ON THE ENTITY
      marker.setDynamicProperty("structureName", buildConfig.structure_name);
      marker.setDynamicProperty("structureSizeX", buildConfig.structure_size.x);
      marker.setDynamicProperty("structureSizeY", buildConfig.structure_size.y);
      marker.setDynamicProperty("structureSizeZ", buildConfig.structure_size.z);
      marker.setDynamicProperty("foundationBlockId", blockId);
      marker.setDynamicProperty("isClear", false); // Initial state
    }
  });

  // --- Event: Player Breaks Foundation Block ---
  world.afterEvents.playerBreakBlock.subscribe((event) => {
    const { player, block, brokenBlockPermutation } = event;
    const dimension = player.dimension;
    const foundationLoc = block.location;

    // Look for a marker entity at the broken block's location
    const marker = getMarkerEntityAt(dimension, foundationLoc);

    if (marker) {
      // Check if the broken block is the foundation this marker expected
      const foundationBlockId = marker.getDynamicProperty("foundationBlockId");
      if (brokenBlockPermutation.type.id === foundationBlockId) {
        log(
          `[Player Build] Foundation block broken by ${
            player.name
          } at ${JSON.stringify(foundationLoc)}. Cleaning up preview...`
        );

        // Get the size data BEFORE killing the entity

        const structureSize = {
          x: marker.getDynamicProperty("structureSizeX"),
          y: marker.getDynamicProperty("structureSizeY"),
          z: marker.getDynamicProperty("structureSizeZ"),
        };

        // Clean up the preview blocks (red/green)
       
        cleanupPreviewBlocks(dimension, foundationLoc, structureSize);

        // Kill the marker entity
  
        marker.kill();

        player.sendMessage({ translate: "build_cancelled" });
      }
    }
  });

  // --- Event: Player Interacts with Foundation Block ---
  world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    const dimension = player.dimension;
    const foundationLoc = block.location;

    // Look for a marker entity at the block's location

    const marker = getMarkerEntityAt(dimension, foundationLoc);

    if (marker) {
      // Get data from the entity

      const structureName = marker.getDynamicProperty("structureName");
      const isClear = marker.getDynamicProperty("isClear"); // Read the state saved by the loop

      if (isClear) {
        log(
          `[Player Build] Interaction with CLEAR foundation at ${JSON.stringify(
            foundationLoc
          )}. Attempting build...`
        );

        const structureSize = {
          x: marker.getDynamicProperty("structureSizeX"),
          y: marker.getDynamicProperty("structureSizeY"),
          z: marker.getDynamicProperty("structureSizeZ"),
        };

        try {
          // 1. Clean up the preview blocks (green)

          cleanupPreviewBlocks(dimension, foundationLoc, structureSize);

          // 2. Load the structure

          const structureCommand = `structure load ${structureName} ${foundationLoc.x} ${foundationLoc.y} ${foundationLoc.z}`;
          log(`[Player Build] Executing command: ${structureCommand}`);
          dimension.runCommand(structureCommand);

          // 3. Remove the foundation block (now replaced by the structure)

          const setBlockCommand = `setblock ${foundationLoc.x} ${foundationLoc.y} ${foundationLoc.z} air destroy`;
          dimension.runCommand(setBlockCommand);

          // 4. Inform the player and KILL the marker entity

          player.sendMessage({
            translate: "build_success",
            with: ["Player", structureName],
          });
          marker.kill();
        } catch (e) {
          log(
            `[Player Build] !!! ERROR during build process: ${e}\n${e.stack}`
          );
          player.sendMessage({
            translate: "action_build_fail_error",
            with: ["Player"],
          });
          // Try to clean up and kill even on error

          cleanupPreviewBlocks(dimension, foundationLoc, structureSize);
          marker.kill();
        }
      } else {
        // If the area was not clear (isClear === false)

        log(
          `[Player Build] Interaction with OBSTRUCTED foundation at ${JSON.stringify(
            foundationLoc
          )}. Build denied.`
        );
        player.sendMessage({
          translate: "build_fail_obstructed",
          with: ["Area"],
        });
      }
    }
  });

  // --- Start the Update Loop ---

  system.runInterval(updatePlayerPreviews, 20); // Check every second (20 ticks)
  log("[Player Build System] Preview update loop started.");
}
