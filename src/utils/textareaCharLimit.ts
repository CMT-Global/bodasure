/**
 * Textarea character limit: plain text, max 500 characters.
 */
export const TEXTAREA_MAX_CHARS = 500;

/**
 * Returns true if the text exceeds the maximum character count.
 */
export function isOverCharLimit(value: string, maxChars: number = TEXTAREA_MAX_CHARS): boolean {
  return value.length > maxChars;
}
