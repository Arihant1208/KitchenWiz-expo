/**
 * ID Generation Utilities
 */

/**
 * Generate a random alphanumeric ID (7 chars).
 * Suitable for client-facing temporary IDs.
 */
export function randomId(): string {
  return Math.random().toString(36).substring(7);
}
