// config/villager-config.js

// --- General Settings ---
export const DEBUG = true;
export const isWarn = true;
export const thresholdDistanceFactor = 0.25;
export const nameMatchThreshold = 0.6;
export const waitingBoxCoords = { x: 0, y: 319, z: 0 };
export const STRUCTURE_TEMPLATE_LOCATION = { x: 1, y: 0, z: 1 }; // Ensure loaded
export const VILLAGER_SEARCH_RADIUS = 16;

// --- Action Timings (in minutes) ---
const short_time = DEBUG ? [0.1] : [5, 8];
const medium_time = DEBUG ? [0.2] : [10, 15];
const long_time = DEBUG ? [0.3] : [20, 30];

export const actionTimes = {
  mine: medium_time,
  hunt: short_time,
  farm: medium_time,
  gather: medium_time,
  fish: medium_time,
  smelt: short_time,
  alchemy: long_time,
  raid: short_time,
  explore: long_time,
  craft: short_time,
  build_house: long_time,
  build_barracks: long_time,
};

// --- Action Specifics (Tools & Loot) ---
export const actionDetails = {
  mine: {
    tool: "minecraft:iron_pickaxe",
    loot_table: [
      {
        item: "minecraft:cobblestone",
        min_qty: 16,
        max_qty: 64,
        time_factor: 1,
        chance: 1,
      },
      {
        item: "minecraft:coal",
        min_qty: 4,
        max_qty: 32,
        time_factor: 1.2,
        chance: 0.9,
      },
      {
        item: "minecraft:raw_iron",
        min_qty: 3,
        max_qty: 24,
        time_factor: 1.5,
        chance: 0.85,
      },
      {
        item: "minecraft:raw_copper",
        min_qty: 3,
        max_qty: 40,
        time_factor: 1.8,
        chance: 0.8,
      },
      {
        item: "minecraft:raw_gold",
        min_qty: 2,
        max_qty: 16,
        time_factor: 2.5,
        chance: 0.65,
      },
      {
        item: "minecraft:redstone",
        min_qty: 5,
        max_qty: 40,
        time_factor: 2,
        chance: 0.7,
      },
      {
        item: "minecraft:lapis_lazuli",
        min_qty: 3,
        max_qty: 24,
        time_factor: 2.3,
        chance: 0.6,
      },
      {
        item: "minecraft:diamond",
        min_qty: 1,
        max_qty: 6,
        time_factor: 4,
        chance: 0.35,
      },
      {
        item: "minecraft:emerald",
        min_qty: 1,
        max_qty: 4,
        time_factor: 5,
        chance: 0.25,
      },
      {
        item: "minecraft:quartz",
        min_qty: 4,
        max_qty: 32,
        time_factor: 2,
        chance: 0.75,
      },
      {
        item: "minecraft:glowstone_dust",
        min_qty: 4,
        max_qty: 32,
        time_factor: 2,
        chance: 0.75,
      },
      {
        item: "minecraft:nether_gold_ore",
        min_qty: 2,
        max_qty: 20,
        time_factor: 2.5,
        chance: 0.6,
      },
      {
        item: "minecraft:ancient_debris",
        min_qty: 1,
        max_qty: 3,
        time_factor: 6,
        chance: 0.12,
      },
      {
        item: "minecraft:netherite_scrap",
        min_qty: 1,
        max_qty: 2,
        time_factor: 7,
        chance: 0.08,
      },
      {
        item: "minecraft:obsidian",
        min_qty: 2,
        max_qty: 12,
        time_factor: 3,
        chance: 0.4,
      },
      {
        item: "minecraft:amethyst_shard",
        min_qty: 4,
        max_qty: 24,
        time_factor: 2.5,
        chance: 0.7,
      },
      {
        item: "minecraft:tuff",
        min_qty: 8,
        max_qty: 48,
        time_factor: 1.5,
        chance: 0.9,
      },
      {
        item: "minecraft:deepslate",
        min_qty: 8,
        max_qty: 48,
        time_factor: 1.5,
        chance: 0.9,
      },
      {
        item: "minecraft:calcite",
        min_qty: 3,
        max_qty: 24,
        time_factor: 2,
        chance: 0.7,
      },
      {
        item: "minecraft:blackstone",
        min_qty: 8,
        max_qty: 48,
        time_factor: 2,
        chance: 0.8,
      },
      {
        item: "minecraft:dripstone_block",
        min_qty: 4,
        max_qty: 32,
        time_factor: 1.8,
        chance: 0.8,
      },
      {
        item: "minecraft:clay_ball",
        min_qty: 5,
        max_qty: 32,
        time_factor: 1,
        chance: 0.85,
      },
      {
        item: "minecraft:copper_ingot",
        min_qty: 2,
        max_qty: 12,
        time_factor: 3,
        chance: 0.75,
      },
    ],
  },
  hunt: {
    tool: "minecraft:iron_sword",
    loot_table: [
      {
        item: "minecraft:chicken",
        min_qty: 2,
        max_qty: 10,
        time_factor: 1,
        chance: 0.9,
      },
      {
        item: "minecraft:porkchop",
        min_qty: 2,
        max_qty: 8,
        time_factor: 1.5,
        chance: 0.9,
      },
      {
        item: "minecraft:beef",
        min_qty: 2,
        max_qty: 8,
        time_factor: 1.5,
        chance: 0.85,
      },
      {
        item: "minecraft:mutton",
        min_qty: 2,
        max_qty: 8,
        time_factor: 1.5,
        chance: 0.85,
      },
      {
        item: "minecraft:rabbit",
        min_qty: 1,
        max_qty: 4,
        time_factor: 1.8,
        chance: 0.7,
      },
      {
        item: "minecraft:leather",
        min_qty: 1,
        max_qty: 6,
        time_factor: 1.5,
        chance: 0.8,
      },
      {
        item: "minecraft:feather",
        min_qty: 2,
        max_qty: 20,
        time_factor: 1,
        chance: 0.9,
      },
      {
        item: "minecraft:string",
        min_qty: 1,
        max_qty: 10,
        time_factor: 1.8,
        chance: 0.8,
      },
      {
        item: "minecraft:bone",
        min_qty: 1,
        max_qty: 12,
        time_factor: 1.5,
        chance: 0.85,
      },
      {
        item: "minecraft:arrow",
        min_qty: 2,
        max_qty: 16,
        time_factor: 1.2,
        chance: 0.75,
      },
      {
        item: "minecraft:gunpowder",
        min_qty: 1,
        max_qty: 10,
        time_factor: 2,
        chance: 0.65,
      },
      {
        item: "minecraft:ender_pearl",
        min_qty: 1,
        max_qty: 3,
        time_factor: 3,
        chance: 0.3,
      },
      {
        item: "minecraft:blaze_rod",
        min_qty: 1,
        max_qty: 5,
        time_factor: 3,
        chance: 0.4,
      },
      {
        item: "minecraft:magma_cream",
        min_qty: 1,
        max_qty: 5,
        time_factor: 2.5,
        chance: 0.6,
      },
      {
        item: "minecraft:slime_ball",
        min_qty: 1,
        max_qty: 12,
        time_factor: 2,
        chance: 0.7,
      },
      {
        item: "minecraft:phantom_membrane",
        min_qty: 1,
        max_qty: 4,
        time_factor: 3,
        chance: 0.3,
      },
      {
        item: "minecraft:shulker_shell",
        min_qty: 1,
        max_qty: 2,
        time_factor: 4,
        chance: 0.2,
      },
      {
        item: "minecraft:witherskeleton_skull",
        min_qty: 1,
        max_qty: 1,
        time_factor: 5,
        chance: 0.08,
      },
      {
        item: "minecraft:nether_star",
        min_qty: 1,
        max_qty: 1,
        time_factor: 6,
        chance: 0.04,
      },
      {
        item: "minecraft:ink_sac",
        min_qty: 2,
        max_qty: 12,
        time_factor: 1.2,
        chance: 0.85,
      },
      {
        item: "minecraft:prismarine_shard",
        min_qty: 1,
        max_qty: 6,
        time_factor: 2.5,
        chance: 0.4,
      },
      {
        item: "minecraft:tropical_fish",
        min_qty: 2,
        max_qty: 10,
        time_factor: 2,
        chance: 0.75,
      },
      {
        item: "minecraft:emerald",
        min_qty: 1,
        max_qty: 4,
        time_factor: 2.5,
        chance: 0.45,
      },
      {
        item: "minecraft:echo_shard",
        min_qty: 1,
        max_qty: 3,
        time_factor: 3,
        chance: 0.35,
      },
    ],
  },
  farm: {
    tool: "minecraft:iron_hoe",
    loot_table: [
      { item: "minecraft:wheat", min_qty: 12, max_qty: 24, time_factor: 1 },
      { item: "minecraft:potato", min_qty: 8, max_qty: 18, time_factor: 1.5 },
      { item: "minecraft:carrot", min_qty: 8, max_qty: 18, time_factor: 1.5 },
      { item: "minecraft:beetroot", min_qty: 6, max_qty: 15, time_factor: 1.5 },
      {
        item: "minecraft:melon_slice",
        min_qty: 6,
        max_qty: 16,
        time_factor: 2,
      },
      { item: "minecraft:honeycomb", min_qty: 1, max_qty: 3, time_factor: 5 },
    ],
  },
  gather: {
    tool: "minecraft:iron_axe",
    loot_table: [
      { item: "minecraft:oak_log", min_qty: 16, max_qty: 32, time_factor: 1 },
      { item: "minecraft:stick", min_qty: 10, max_qty: 20, time_factor: 1 },
      { item: "minecraft:apple", min_qty: 1, max_qty: 3, time_factor: 4 },
      { item: "minecraft:dandelion", min_qty: 5, max_qty: 10, time_factor: 1 },
    ],
  },
  fish: {
    tool: "minecraft:fishing_rod",
    loot_table: [
      { item: "minecraft:cod", min_qty: 2, max_qty: 6, time_factor: 1 },
      { item: "minecraft:salmon", min_qty: 2, max_qty: 5, time_factor: 2 },
      { item: "minecraft:pufferfish", min_qty: 1, max_qty: 2, time_factor: 4 },
      {
        item: "minecraft:leather_boots",
        min_qty: 1,
        max_qty: 1,
        time_factor: 8,
      },
      { item: "minecraft:saddle", min_qty: 1, max_qty: 1, time_factor: 15 },
      {
        item: "minecraft:enchanted_book",
        min_qty: 1,
        max_qty: 1,
        time_factor: 20,
      },
    ],
  },
  smelt: {
    tool: "minecraft:blast_furnace",
    loot_table: [
      { item: "minecraft:iron_ingot", min_qty: 4, max_qty: 10, time_factor: 2 },
      { item: "minecraft:gold_ingot", min_qty: 2, max_qty: 6, time_factor: 3 },
      { item: "minecraft:glass", min_qty: 8, max_qty: 16, time_factor: 1 },
      {
        item: "minecraft:netherite_ingot",
        min_qty: 1,
        max_qty: 1,
        time_factor: 25,
      },
    ],
  },
  alchemy: {
    tool: "minecraft:brewing_stand",
    loot_table: [
      {
        item: "minecraft:glass_bottle",
        min_qty: 3,
        max_qty: 6,
        time_factor: 1,
      },
      {
        item: "minecraft:blaze_powder",
        min_qty: 1,
        max_qty: 3,
        time_factor: 4,
      },
      {
        item: "minecraft:fermented_spider_eye",
        min_qty: 1,
        max_qty: 2,
        time_factor: 6,
      },
    ],
  },
  explore: {
    tool: "minecraft:compass",
    reward_type: "structure_location",
    loot_table: [
      "village",
      "pillager_outpost",
      "desert_pyramid",
      "jungle_temple",
      "ruined_portal",
      "shipwreck",
      "mineshaft",
      "mansion",
      "stronghold",
    ],
  },
  craft: {
    tool: "minecraft:crafting_table",
    loot_table: [
      { item: "minecraft:chest", min_qty: 2, max_qty: 6, time_factor: 2 },
      { item: "minecraft:shield", min_qty: 1, max_qty: 1, time_factor: 4 },
      { item: "minecraft:tnt", min_qty: 1, max_qty: 3, time_factor: 8 },
    ],
  },
  raid: { tool: "minecraft:crossbow" },
  build: [
    {
      intent_name: "build_house", // Corresponds to intent name in villager-actions.js
      foundation_block: "mm:ground_house_placer", // Specific foundation block
      structure_name: "ground_house", // .mcstructure name
      structure_size: { x: 5, y: 4, z: 5 }, // !! EXACT Size X, Y, Z !!
      build_time_per_layer: DEBUG ? 5 : 120, // Seconds per layer
      time_variation_factor: 0.2,
      tool: "minecraft:iron_shovel", // Visual tool
    },
    // --- Example for another structure ---
    // {
    //   intent_name: "build_barracks",
    //   foundation_block: "mm:barracks_placer", // Different foundation block
    //   structure_name: "barracks_level_1",
    //   structure_size: { x: 8, y: 6, z: 7 },
    //   build_time_per_layer: DEBUG ? 8 : 180,
    //   time_variation_factor: 0.15,
    //   tool: "minecraft:stone_axe"
    // }
    // Add more buildable structures here
  ],
};
