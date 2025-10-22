// modules/translator.js
import { world } from "@minecraft/server";

// This constant is no longer needed because the native 'translate'
// key automatically uses the correct language for each client.
// const FALLBACK_LANG = "pt_BR"; 

/**
 * Builds a translation object for Minecraft's native rawtext system.
 * This function *returns* the RawMessage object, it does not send it.
 * This allows it to be used inside other functions like player.sendMessage() or log().
 *
 * @param {import("@minecraft/server").Player | undefined} player - (Ignored) This argument is kept
 * for compatibility with existing calls (e.g., t(player, ...)), but
 * the 'translate' key works client-side, so the player object isn't needed here.
 * @param {string} key - The translation key (e.g., "sim_found_match" from your .lang file).
 * @param {...(string | number)} args - Arguments to replace placeholders (%s, %1, etc.) in the .lang file.
 * @returns {import("@minecraft/server").RawMessage} The RawMessage object, ready to be sent.
 */
export function t(player, key, ...args) {
  // Create the RawMessage object that Minecraft expects.
  const message = {
    rawtext: [
      {
        // 'translate' tells Minecraft to look up this key in the client's language files.
        translate: key,
        // 'with' is an array of values to insert into the translation's placeholders.
        // We must convert all arguments to strings, as required by the 'with' property.
        with: args.length > 0 ? args.map(String) : undefined,
      },
    ],
  };

  // Instead of sending the message, we return the object.
  // This allows the calling function (e.g., in conversation.js) to decide what to do with it.
  return message;
}

/**
 * Sends a translation directly to the console (no player required).
 * Useful for server logs; uses the server's default language.
 *
 * @param {string} key - The translation key.
 * @param {...(string | number)} args - Arguments for placeholders.
 */
export function tConsole(key, ...args) {
  // We build the same RawMessage object as the 't' function
  const message = {
    rawtext: [
      {
        translate: key,
        with: args.length > 0 ? args.map(String) : undefined,
      },
    ],
  };
  
  // Send the message directly to the server console.
  world.sendMessage(message);
}