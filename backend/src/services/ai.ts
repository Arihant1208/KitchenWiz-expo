/**
 * AI Service
 *
 * Manages Gemini model instantiation and common AI operations.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from '../constants';
import { cleanJson, parseLlmJson } from '../helpers';

// ---------------------------------------------------------------------------
// Model Management (Singleton with cache invalidation)
// ---------------------------------------------------------------------------

let cachedModel: GenerativeModel | null = null;
let cachedApiKey: string | null = null;
let cachedModelName: string | null = null;

/**
 * Get or create the Gemini model instance.
 * Uses caching to avoid recreating the model on every request.
 */
export function getModel(): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY env var');
  }

  const modelName = DEFAULT_GEMINI_MODEL;

  if (!cachedModel || cachedApiKey !== apiKey || cachedModelName !== modelName) {
    const genAI = new GoogleGenerativeAI(apiKey);
    cachedModel = genAI.getGenerativeModel({ model: modelName });
    cachedApiKey = apiKey;
    cachedModelName = modelName;
  }

  return cachedModel;
}

// ---------------------------------------------------------------------------
// Common AI Operations
// ---------------------------------------------------------------------------

export interface GenerateJsonOptions {
  prompt: string;
  image?: {
    mimeType: string;
    data: string;
  };
}

/**
 * Generate content and parse as JSON.
 */
export async function generateJson<T = unknown>(options: GenerateJsonOptions): Promise<T> {
  const model = getModel();

  const parts: any[] = [];

  if (options.image) {
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType || 'image/jpeg',
        data: options.image.data,
      },
    });
  }

  parts.push({ text: options.prompt });

  const result = await model.generateContent(parts);
  const text = result.response.text();
  const parsed = parseLlmJson<T>(text);

  if (parsed === null) {
    throw new Error('Failed to parse AI response as JSON');
  }

  return parsed;
}

/**
 * Generate content as raw text.
 */
export async function generateText(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Start a chat session and send a message.
 */
export async function chat(
  message: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }> = []
): Promise<string> {
  const model = getModel();
  const chatSession = model.startChat({ history });
  const result = await chatSession.sendMessage(message);
  return result.response.text();
}

// ---------------------------------------------------------------------------
// Prompt Building Helpers
// ---------------------------------------------------------------------------

export interface UserContext {
  cuisinePreferences?: string[];
  dietaryRestrictions?: string[];
  allergies?: string[];
  householdSize?: number;
  maxCookingTime?: number;
}

/**
 * Build user context string for prompts.
 */
export function buildUserContext(user: UserContext): string {
  return `
- Cuisine preferences: ${user.cuisinePreferences?.join(', ') || 'Any'}
- Dietary restrictions: ${user.dietaryRestrictions?.join(', ') || 'None'}
- Allergies: ${user.allergies?.join(', ') || 'None'}
`.trim();
}
