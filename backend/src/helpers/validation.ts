/**
 * Validation Utilities
 */

/**
 * Safely get a positive integer, with fallback.
 */
export function safePositiveInt(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
}
