import { world, system } from "@minecraft/server";
import { classifyMessage } from "./classifier";
import { villager_actions_intents } from "./intents/villager-actions";
import { confirmation_intents } from "./intents/confirmation";
import { cleanAndTokenize, levenshtein } from "./utils";

const namedVillagers = new Map();
const thresholdDistanceFactor = 0.25;
const time = [Math.floor(1 - (1 / 3) * 2)];


const actionTimes = {
  minerar: time,
  construir: time,
  caçar: time,
  proteger: time,
};

/* 
const actionTimes = {
  minerar: [2, 5, 10],
  construir: [5, 10, 15],
  caçar: [3, 6, 12],
  proteger: [1, 3, 5],
}; */

function updateNamedVillagers() {
  const overworld = world.getDimension("overworld");
  for (const villager of overworld.getEntities({
    type: "minecraft:villager",
  })) {
    const name = villager.nameTag?.trim();
    if (!name) continue;

    const formatted =
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const key = formatted.toLowerCase();

    if (!namedVillagers.has(key)) {
      namedVillagers.set(key, {
        entity: villager,
        busy: false,
        pendingAction: null,
        waitingInstruction: false, // novo estado
      });
      console.warn(`[VILLAGER] Registrado: ${formatted}`);
    }
  }
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function getClosestVillager(msgTokens) {
  let best = { name: null, score: 0 };

  for (const [name] of namedVillagers) {
    for (const token of msgTokens) {
      const score = similarity(token, name.toLowerCase());
      if (score > best.score) best = { name, score };
    }
  }
  return best;
}

function startAction(villagerData, action, player) {
  const entity = villagerData.entity;
  const actionName = action.intent;
  const times = actionTimes[actionName] || [5];
  const chosenTime = randomFrom(times);

  const messages = [
    `Ok, vou ${actionName} e volto em ${chosenTime} minutos.`,
    `Beleza, deixa comigo! ${actionName} agora.`,
    `Vou ${actionName}, já volto em ${chosenTime} minutos.`,
  ];

  villagerData.busy = true;
  villagerData.pendingAction = null;
  villagerData.waitingInstruction = false;

  player.sendMessage(`<${entity.nameTag}> ${randomFrom(messages)}`);
  console.log(`[ACTION START] ${entity.nameTag} -> ${actionName}`);

  system.runTimeout(() => {
    villagerData.busy = false;
    player.sendMessage(`<${entity.nameTag}> Terminei de ${actionName}!`);
    console.log(`[ACTION DONE] ${entity.nameTag} finalizou ${actionName}`);
  }, chosenTime * 60 * 20);
}

function handleConfirmation(player, villagerData, msg) {
  const conf = classifyMessage(
    msg,
    confirmation_intents,
    thresholdDistanceFactor
  );
  const entity = villagerData.entity;

  if (conf.status === "matched" && conf.intent === "yes") {
    startAction(villagerData, villagerData.pendingAction.action, player);
  } else if (conf.status === "matched" && conf.intent === "no") {
    player.sendMessage(`<${entity.nameTag}> Beleza, cancelando então.`);
    villagerData.pendingAction = null;
  } else {
    player.sendMessage(
      `<${entity.nameTag}> Não entendi se é pra confirmar ou não.`
    );
  }
}

system.runInterval(() => updateNamedVillagers(), 20 * 5);

world.afterEvents.chatSend.subscribe((event) => {
  const raw = event.message.trim();
  const msg = raw.toLowerCase();
  const player = event.sender;
  if (namedVillagers.size === 0) return;

  const tokens = cleanAndTokenize(msg);
  const { name: closestName, score } = getClosestVillager(tokens);

  // caso ele já esteja esperando instrução (sem precisar mencionar o nome)
  let villager = null;
  if (closestName && score >= 0.4) {
    villager = namedVillagers.get(closestName);
  } else {
    villager = [...namedVillagers.values()].find(
      (v) => v.waitingInstruction && !v.busy
    );
  }

  if (!villager || villager.busy) return;

  const entity = villager.entity;
  const formattedName =
    entity.nameTag.charAt(0).toUpperCase() +
    entity.nameTag.slice(1).toLowerCase();

  // confirmação
  if (villager.pendingAction) {
    handleConfirmation(player, villager, msg);
    return;
  }

  // classificar ação
  const action = classifyMessage(
    msg,
    villager_actions_intents,
    thresholdDistanceFactor
  );
  console.log(
    `[DEBUG] "${raw}" => ${formattedName} (${score.toFixed(2)}) -> ${
      action.intent
    } (${action.distance})`
  );

  if (action.status === "matched") {
    startAction(villager, action, player);
  } else {
    player.sendMessage(
      `<${formattedName}> O que exatamente você quer que eu faça?`
    );
    villager.waitingInstruction = true; // agora ele vai ouvir o próximo comando direto
  }
});

console.log("[SYSTEM] IA de aldeões v3 carregada ✅");
