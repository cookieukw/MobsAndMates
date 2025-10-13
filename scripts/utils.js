export const cleanAndTokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .filter(Boolean);

export const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Returns a random item from an array.
 * @param {Array} arr The input array.
 * @returns {*} A random element from the array.
 */
export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


/**
 * Calculates a similarity score (0 to 1) between two strings.
 * 1 means identical, 0 means completely different.
 * It uses the Levenshtein distance as a basis.
 */
export function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // If both strings are empty, they are 100% similar.
  return 1 - levenshtein(a, b) / maxLen;
}



