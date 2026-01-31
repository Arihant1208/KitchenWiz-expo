/**
 * JSON Parsing Utilities
 */

/**
 * Clean markdown code fence markers from JSON text.
 * Useful for parsing LLM responses that wrap JSON in ```json ... ```.
 */
export function cleanJson(text: string): string {
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeParseJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Parse LLM JSON response (cleans code fences first).
 */
export function parseLlmJson<T = unknown>(text: string): T | null {
  return safeParseJson<T>(cleanJson(text));
}
