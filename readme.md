
# Mobs&Mate

A Minecraft Bedrock Scripting Addon that turns villagers into smart, command-driven companions. Talk to them naturally, assign jobs, and watch them act like real partners — mining, fishing, exploring, and more.

## ✨ Features

- **Natural Commands:** Speak in English or Portuguese, even with typos — villagers understand via fuzzy matching.
- **Smart Conversations:** They confirm who you’re talking to and won’t mix up players in multiplayer.
- **Multilanguage:** Fully localized for English and Brazilian Portuguese(yet).
- **Professions System:** Mining, farming, exploring, fishing, and more.
- **Custom Loots & Timings:** Edit a single config to tweak drops and durations.
- **Multiplayer Ready:** Clean session tracking — each player interacts with their own villager.



## 💬 How to Use

### 1. Name a Villager
Use a Name Tag first. Only named villagers respond.

### 2. Talk to Them
Say their name in chat.

```

> Ruan 
<Ruan> What do you want me to do?

```

Misspell? No problem — they’ll ask if you meant them.

```

> Runn 
<Ruan> Are you talking to me?
> yes
<Ruan> What do you want me to do?

```

### 3. Give Orders
Once focused, just say what to do.

```

> Ruan 
<Ruan> What do you want me to do?
> go fishing 
<Ruan> Alright, getting ready to fish.

````

## 🧠 Professions

| Profession | Example Commands | What Happens |
|-------------|------------------|---------------|
| **Mine** | mine / minerar | Equips pickaxe, disappears, returns with ores + cobble. |
| **Hunt** | hunt / caçar | Equips sword, brings mob drops. |
| **Farm** | farm / farmar | Equips hoe, brings crops. |
| **Gather** | gather / catar recursos | Equips axe, brings logs, sand, etc. |
| **Fish** | fish / pescar | Uses fishing rod, brings fish + junk + treasure. |
| **Smelt** | smelt / fundir | Uses furnace, brings ingots and glass. |
| **Alchemy** | brew / fazer poção | Uses brewing stand, brings potion mats. |
| **Craft** | craft / criar | Uses crafting table, returns with tools/items. |
| **Explore** | explore / explorar | Uses compass, returns with coords of random structure. |
| **Raid** | defend / defender | WIP — equips crossbow, will soon fight mobs. |
| **Come Here** | come here / vem cá | Teleports near you. |

## ⚙️ Config

Edit `scripts/config/villager-config.js`.

- `DEBUG`: if true, makes tasks super fast (for testing).
- `nameMatchThreshold`: controls name recognition (default 0.6).
- `actionTimes`: defines durations for each profession.
- `actionDetails`: all loot, tools, and time multipliers.

### Example Loot Setup

```js
fish: {
  tool: "minecraft:fishing_rod",
  loot_table: [
    { item: "minecraft:cod", min_qty: 2, max_qty: 6, time_factor: 1 },
    { item: "minecraft:salmon", min_qty: 2, max_qty: 5, time_factor: 2 },
    { item: "minecraft:pufferfish", min_qty: 1, max_qty: 2, time_factor: 5 },
    { item: "minecraft:leather_boots", min_qty: 1, max_qty: 1, time_factor: 8 },
    { item: "minecraft:saddle", min_qty: 1, max_qty: 1, time_factor: 20 }
  ]
},

gather: {
  tool: "minecraft:iron_axe",
  loot_table: [
    { item: "minecraft:oak_log", min_qty: 8, max_qty: 24, time_factor: 2 },
    { item: "minecraft:sand", min_qty: 10, max_qty: 32, time_factor: 1 },
    { item: "minecraft:cobblestone", min_qty: 10, max_qty: 20, time_factor: 2 },
    { item: "minecraft:sugar_cane", min_qty: 5, max_qty: 15, time_factor: 1 },
    { item: "minecraft:dandelion", min_qty: 3, max_qty: 10, time_factor: 1 }
  ]
},

explore: {
  reward_type: "discovery",
  loot_table: [
    "structure_village",
    "structure_pillager_outpost",
    "structure_desert_pyramid",
    "structure_jungle_temple",
    "structure_ruined_portal",
    "structure_shipwreck",
    "structure_mineshaft"
  ]
}
````

## 🧩 Structure

```
📁 scripts
├── 📁 config
│   └── villager-config.js
├── 📁 intents
│   ├── confirmation.js
│   └── villager-actions.js
├── 📁 lang
│   ├── en_US.js
│   └── pt_BR.js
├── 📁 modules
│   ├── action-handler.js
│   ├── conversation.js
│   ├── entity-manager.js
│   └── translator.js
├── classifier.js
├── main.js
└── utils.js
```

## 🔮 Roadmap

* Full raid/defend system (actual combat).
* New roles (breeder, enchanter, blacksmith).
* GUI to monitor villager tasks and progress.
* Configurable XP and economy rewards.
* Structure builders



