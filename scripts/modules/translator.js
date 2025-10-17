// modules/translator.js

/**
 * @file Manages language translations for player-facing text.
 */

import en_US from "../lang/en_US";
import pt_BR from "../lang/pt_BR";

// The fallback language if a player's language is not supported or if no player is provided.
const FALLBACK_LANG = "pt_BR";

// Maps language codes from Minecraft to our imported JSON files.
const translations = {
  en_US,
  pt_BR,'pt_PT': pt_BR
};

/**
 * Translates a given key. If a player is provided, it uses their language.
 * Otherwise, it uses the fallback language (ideal for console logs).
 * @param {import("@minecraft/server").Player | undefined} player The player object or undefined.
 * @param {string} key The translation key (e.g., "villager_unclear_intent").
 * @param {(string | number)[]} args An array of values to replace placeholders like {0}, {1}, etc.
 * @returns {string} The translated and formatted string.
 */
export function t(player, key, ...args) {
  // Determine which language file to use.
  // If a player object exists, use their language. Otherwise, use the fallback.
  const langFile = player
    ? translations[player.lang] || translations[FALLBACK_LANG]
    : translations[FALLBACK_LANG];
  const fallbackFile = translations[FALLBACK_LANG];

  // Get the template string. Fallback to English if the key is missing in the target language.
  let template = langFile[key] || fallbackFile[key];

  // If the key doesn't exist anywhere, return the key itself so it's obvious something is missing.
  if (!template) {
    return key;
  }

  // Replace placeholders {0}, {1}, {2}... with the provided arguments.
  return template.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== "undefined" ? args[number] : match;
  });
}
