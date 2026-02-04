/** Maximum word count allowed for description fields across the app. */
export const DESCRIPTION_MAX_WORDS = 300;

/**
 * Counts words in a string (whitespace-separated, empty strings filtered).
 */
export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Returns true if the string exceeds DESCRIPTION_MAX_WORDS.
 */
export function isDescriptionOverLimit(value: string, maxWords: number = DESCRIPTION_MAX_WORDS): boolean {
  return countWords(value) > maxWords;
}
