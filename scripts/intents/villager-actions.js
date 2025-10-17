// intents/villager-actions.js
export const villager_actions_intents = [
  {
    name: "mine",
    trainingPhrases: [
      // Portuguese
      "minerar",
      "escavar",
      "vai minerar",
      "escavar chão",
      "buscar minério",
      "pegar minério",
      // English
      "mine",
      "dig",
      "go mine",
      "start mining",
      "go dig some ores",
      "get some stone",
      "find some iron",
    ],
    // English responses added
    responses: [
        "Okay, I'll go mining.",
        "Heading to the caves now.",
        "Time to find some ores!"
    ]
  },
  {
    name: "build",
    trainingPhrases: [
      // Portuguese
      "construir",
      "edificar",
      "vai construir",
      "montar casa",
      "erguer algo",
      // English
      "build",
      "make a house",
      "create a structure",
      "build something",
      "construct a building",
      "put up a wall",
    ],
    // English responses added
    responses: [
        "Alright, I'll start building.",
        "Time to build something new.",
        "Let's get this structure up!"
    ]
  },
  {
    name: "hunt",
    trainingPhrases: [
      // Portuguese
      "caçar",
      "atacar mobs",
      "vai caçar",
      "pegar carne",
      // English
      "hunting",
      "hunt",
      "go hunt",
      "find food",
      "kill mobs",
      "slay some monsters",
      "get some meat",
    ],
    // English responses added
    responses: [
        "Time to hunt for some food.",
        "I'll go take care of some mobs.",
        "Hunting it is!"
    ]
  },
  {
    name: "protect",
    trainingPhrases: [
      // Portuguese
      "proteger vila",
      "defender",
      "guardar",
      "vai proteger a vila",
      // English
      "protect the village",
      "defend the village",
      "keep us safe",
      "stand guard",
      "protect the people",
      "watch for monsters",
    ],
    // English responses added
    responses: [
        "I'll stand guard and protect the village.",
        "Don't worry, I'll keep an eye out for danger.",
        "I will keep everyone safe."
    ]
  },
  {
    name: "come_here",
    trainingPhrases: [
      // Portuguese
      "vem aqui",
      "venha ate mim",
      "chega mais",
      "pode vir",
      "vem ca",
      "cola aqui",
      // English
      "come here",
      "come to me",
      "get over here",
      "to me",
      "come on over",
      "come closer",
    ],
    // English responses added
    responses: [
        "On my way.",
        "Coming!",
        "Sure, where are you?"
    ]
  },
];