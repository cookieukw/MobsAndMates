// File: scripts/villager_name_gen.js

let usedNames = new Set();

const syllablesStart = [
  "Ka",
  "Lo",
  "Mi",
  "Ru",
  "Sa",
  "Te",
  "Va",
  "Zo",
  "Ne",
  "Fi",
  "Ga",
  "Di",
  "Ar",
  "El",
  "Or",
  "Ul",
  "In",
  "Tha",
  "Bra",
  "Vor",
  "Xe",
  "Qu",
  "Ri",
  "Po",
  "Ma",
  "Jo",
  "Ha",
  "Ni",
  "Pa",
  "Ze",
  "Yu",
  "Ki",
  "Do",
  "Fa",
  "Se",
  "La",
  "Tor",
  "Bel",
  "Var",
  "Gor",
  "Zan",
  "Kel",
  "Fen",
  "Ser",
  "Ion",
  "Grim",
];
const syllablesMiddle = [
  "ri",
  "na",
  "lo",
  "ta",
  "ma",
  "ro",
  "va",
  "za",
  "li",
  "ko",
  "su",
  "fi",
  "dra",
  "sha",
  "lon",
  "mir",
  "kor",
  "zan",
  "ren",
  "vil",
  "tur",
  "sel",
  "mon",
  "dar",
  "tra",
  "zor",
  "vek",
  "sin",
  "ria",
  "pho",
  "tal",
  "gen",
  "bar",
  "kin",
  "vor",
  "rian",
  "thel",
  "mar",
  "den",
  "fur",
  "zen",
  "lir",
  "vok",
  "sar",
];
const syllablesEnd = [
  "n",
  "ra",
  "to",
  "ma",
  "va",
  "dor",
  "zan",
  "s",
  "ka",
  "rix",
  "th",
  "mir",
  "los",
  "dan",
  "nor",
  "rik",
  "vus",
  "sha",
  "zor",
  "li",
  "ren",
  "var",
  "dun",
  "mar",
  "vek",
  "tal",
  "mos",
  "rin",
  "dak",
];

const surnamesByProfession = {
  farmer: ["Greenfield", "Cornhand", "Wheatborn", "VeggieLord", "Haystacker"],
  librarian: [
    "Bookseer",
    "Quillmind",
    "Scrollkeeper",
    "Inkwhisper",
    "Wiseleaf",
  ],
  armorer: [
    "Steelbinder",
    "Ironhide",
    "Shieldsmith",
    "Metalforge",
    "Platestrong",
  ],
  fisherman: ["Swiftfish", "Netthrow", "Deepwater", "Hookmaster", "Seafoot"],
  cleric: ["Holybrew", "Lightcaller", "Soulmend", "Faithstone", "Pureheart"],
  default: [
    "Stonewalker",
    "Dustcatcher",
    "Creeperbane",
    "Torchbearer",
    "TradeMaster",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVillagerName(profession = "default") {
  let name = pick(syllablesStart) + pick(syllablesMiddle);
  if (Math.random() < 0.4) name += pick(syllablesEnd);
  if (Math.random() < 0.5)
    name +=
      " " +
      pick(surnamesByProfession[profession] || surnamesByProfession.default);
  if (usedNames.has(name)) return generateVillagerName(profession);
  usedNames.add(name);
  return name;
}


