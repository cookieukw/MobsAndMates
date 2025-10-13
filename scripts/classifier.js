// classifier.js
import { cleanAndTokenize, levenshtein } from "./utils";

export function classifyMessage(message, intents, thresholdFactor = 0.1) {
  const cleanedMessage = cleanAndTokenize(message).join(" ");
  let bestMatch = { distance: Infinity, phrase: "", intent: null };

  for (const intent of intents) {
    for (const phrase of intent.trainingPhrases) {
      const distance = levenshtein(cleanedMessage, phrase);
      if (distance < bestMatch.distance) {
        bestMatch = { distance, phrase, intent };
      }
    }
  }

  const threshold = bestMatch.phrase
    ? Math.floor(bestMatch.phrase.length * thresholdFactor)
    : 0;

  const matched = bestMatch.intent && bestMatch.distance <= threshold;

  return {
    status: matched ? "matched" : "unmatched",
    intent: matched ? bestMatch.intent.name : null,
    response: matched ? bestMatch.intent.responses[0] : null,
    closestPhrase: matched ? null : bestMatch.phrase,
    distance: bestMatch.distance,
    threshold,
  };
}
