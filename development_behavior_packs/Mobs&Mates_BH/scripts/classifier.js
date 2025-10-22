// classifier.js

/**
 * @fileoverview This module provides functionality to classify a user's message
 * against a predefined set of intents using the Levenshtein distance algorithm.
 */

// Imports utility functions for text processing and distance calculation.
import { cleanAndTokenize, levenshtein } from "./utils";

/**
 * Classifies a user's message by finding the closest matching training phrase
 * from a list of intents. A match is considered successful if the calculated
 * Levenshtein distance is within a dynamic threshold.
 *
 * @param {string} message The raw user input message to classify.
 * @param {Array<Object>} intents An array of intent objects. Each object should
 * contain a `name`, an array of `trainingPhrases`, and an array of `responses`.
 * @param {number} [thresholdFactor=0.1] A factor (between 0 and 1) used to
 * calculate the maximum allowed Levenshtein distance for a match. The threshold is
 * `thresholdFactor * length_of_the_best_matching_phrase`. A lower value
 * means stricter matching.
 * @returns {Object} An object containing the classification result.
 * - `status`: 'matched' or 'unmatched'.
 * - `intent`: The name of the matched intent, or null.
 * - `response`: A sample response from the matched intent, or null.
 * - `closestPhrase`: If unmatched, the training phrase that was closest.
 * - `distance`: The Levenshtein distance of the best match.
 * - `threshold`: The calculated distance threshold for a successful match.
 */
export function classifyMessage(message, intents, thresholdFactor = 0.1) {
  // Pre-process the user's message: clean it (e.g., lowercase, remove punctuation)
  // and tokenize it, then join it back into a standardized string.
  const cleanedMessage = cleanAndTokenize(message).join(" ");

  // Initialize an object to track the best match found so far.
  // The distance starts at Infinity to ensure the first comparison finds a "better" match.
  let bestMatch = { distance: Infinity, phrase: "", intent: null };

  // Iterate over each intent provided.
  for (const intent of intents) {
    // Within each intent, iterate over its associated training phrases.
    for (const phrase of intent.trainingPhrases) {
      // Calculate the Levenshtein distance between the user's message and the current training phrase.
      // This measures the number of edits (insertions, deletions, substitutions) needed to change one string into the other.
      const distance = levenshtein(cleanedMessage, phrase);

      // If the current phrase is a closer match (i.e., has a smaller distance) than the best one found so far,
      // update `bestMatch` with the details of this new best match.
      if (distance < bestMatch.distance) {
        bestMatch = { distance, phrase, intent };
      }
    }
  }

  // Calculate the acceptable distance threshold for a match to be considered valid.
  // It's a fraction of the length of the best-matching training phrase.
  // This makes the matching more flexible for longer phrases.
  const threshold = bestMatch.phrase
    ? Math.floor(bestMatch.phrase.length * thresholdFactor)
    : 0;

  // Determine if the best match is good enough.
  // It's a valid match if an intent was found AND its distance is less than or equal to the threshold.
  const matched = bestMatch.intent && bestMatch.distance <= threshold;

  // Return a structured object with the classification result.
  return {
    status: matched ? "matched" : "unmatched",
    intent: matched ? bestMatch.intent.name : null,
    response: matched ? bestMatch.intent.responses[0] : null, // Return the first default response.
    closestPhrase: matched ? null : bestMatch.phrase, // Only show the closest phrase if it was not a match.
    distance: bestMatch.distance,
    threshold,
  };
}