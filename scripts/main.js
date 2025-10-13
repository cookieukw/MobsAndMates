import { world, system } from "@minecraft/server";
import { classifyMessage } from "./classifier";
import { villager_actions_intents } from "./intents/villager-actions";
import { confirmation_intents } from "./intents/confirmation";
import { cleanAndTokenize, levenshtein, randomFrom, similarity } from "./utils";

const namedVillagers = new Map();
const thresholdDistanceFactor = 0.25;
const time = 0;
// Adicione esta linha no topo do seu script
const conversationManager = new Map(); // Gerencia quem está falando com quem
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
  const times = actionTimes[actionName] || [1];
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
  const { message, sender: player } = event;
  if (namedVillagers.size === 0) return;

  const raw = message.trim();
  const msg = raw.toLowerCase();
  const tokens = cleanAndTokenize(msg);

  let targetVillager = null;

  // --- NOVO SISTEMA DE SELEÇÃO E TRAVA DE CONVERSA ---

  // VERIFICA SE O JOGADOR JÁ ESTÁ EM UMA CONVERSA
  const lockedVillagerId = conversationManager.get(player.id);

  if (lockedVillagerId) {
    // Se o jogador já está "travado" com um aldeão, esse é o alvo.
    const villagerEntry = [...namedVillagers.values()].find(
      (v) => v.entity.id === lockedVillagerId
    );
    if (villagerEntry) {
      targetVillager = villagerEntry;
    } else {
      // O aldeão travado não existe mais (morreu?), então libera a trava.
      conversationManager.delete(player.id);
    }
  } else {
    // Se não há trava, o jogador está iniciando uma NOVA conversa.
    const nameMatch = getClosestVillager(tokens);

    // REGRA DE NOME MAIS RÍGIDA
    if (nameMatch.name && nameMatch.score >= 0.6) {
      const potentialTarget = namedVillagers.get(nameMatch.name);

      // VERIFICA SE O ALDEÃO JÁ ESTÁ EM CONVERSA COM OUTRO JOGADOR
      let isLockedByOther = false;
      for (const [playerId, villagerId] of conversationManager.entries()) {
        if (
          villagerId === potentialTarget.entity.id &&
          playerId !== player.id
        ) {
          isLockedByOther = true;
          break;
        }
      }

      if (isLockedByOther) {
        player.sendMessage(
          `§c${potentialTarget.entity.nameTag} está ocupado conversando com outro jogador.§r`
        );
        return; // Impede a interação
      }

      targetVillager = potentialTarget;
    }
  }

  // Se nenhum alvo foi determinado, ignora a mensagem.
  if (!targetVillager || targetVillager.busy) return;

  // --- FIM DO NOVO SISTEMA ---

  const entity = targetVillager.entity;
  const formattedName =
    entity.nameTag.charAt(0).toUpperCase() +
    entity.nameTag.slice(1).toLowerCase();

  // Lógica de confirmação (sim/não)
  if (targetVillager.pendingAction) {
    // Após a confirmação, a conversa termina, então liberamos a trava.
    conversationManager.delete(player.id);
    handleConfirmation(player, targetVillager, msg);
    return;
  }

  // Classifica a mensagem para encontrar uma ação
  const action = classifyMessage(
    msg,
    villager_actions_intents,
    thresholdDistanceFactor
  );

  //console.log(`[DEBUG] Player: ${player.name} | Target: ${formattedName} | Intent: ${action.intent || 'none'}`);
  console.log(
    `[DEBUG] Player: ${
      player.name
    } | Msg: "${raw}" | Target: ${formattedName} | Intent: ${
      action.intent || "none"
    }`
  );
  if (action.status === "matched") {
    // Ação bem-sucedida, a conversa termina. Liberamos a trava.
    conversationManager.delete(player.id);
    startAction(targetVillager, action, player);
  } else {
    // Ação não entendida. O aldeão pede esclarecimento e TRAVA a conversa com este jogador.
    conversationManager.set(player.id, targetVillager.entity.id);
    player.sendMessage(
      `<${formattedName}> O que exatamente você quer que eu faça?`
    );
  }
});

// ADICIONE ESTE BLOCO DE CÓDIGO NO SEU ARQUIVO
/**
 * Este evento é disparado sempre que um jogador sai do mundo.
 * Ele é crucial para limpar qualquer "trava" de conversa que o jogador possa ter deixado para trás.
 */
world.afterEvents.playerLeave.subscribe((event) => {
  const { playerId } = event;

  // Verifica se o jogador que saiu estava em uma conversa
  if (conversationManager.has(playerId)) {
    // Se estava, removemos a trava para liberar o aldeão para outros jogadores.
    conversationManager.delete(playerId);
    console.warn(
      `[CONVERSATION] Jogador ${playerId} saiu e liberou a trava de conversa.`
    );
  }
});

console.log("[SYSTEM] IA de aldeões v5 carregada ✅");
