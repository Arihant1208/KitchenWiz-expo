/**
 * Backend Constants
 *
 * Centralized configuration values and limits.
 */

// ---------------------------------------------------------------------------
// AI Service Configuration
// ---------------------------------------------------------------------------

/** Default Gemini model to use */
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** Maximum AI requests per user per day */
export const DAILY_AI_REQUEST_LIMIT = 20;

// ---------------------------------------------------------------------------
// Recipe Library Configuration
// ---------------------------------------------------------------------------

/** Minimum composite score to reuse a recipe from library */
export const REUSE_SCORE_THRESHOLD = 0.78;

/** Maximum missing ingredients allowed for reuse */
export const REUSE_MAX_MISSING = 3;

/** Default number of library candidates to fetch */
export const DEFAULT_CANDIDATE_LIMIT = 30;

/** Ingredient similarity threshold for duplicate detection */
export const DUPLICATE_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Weekly Planner Configuration
// ---------------------------------------------------------------------------

/** Target average effort (prep + cook) per slot in minutes */
export const TARGET_EFFORT_PER_SLOT = 35;

/** Days of the week */
export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// ---------------------------------------------------------------------------
// Taste Embedding Configuration
// ---------------------------------------------------------------------------

/** Number of dimensions in taste embedding */
export const EMBEDDING_DIMENSIONS = 26;

/** Novelty window in days for freshness scoring */
export const NOVELTY_WINDOW_DAYS = 14;

// ---------------------------------------------------------------------------
// Inventory Categories
// ---------------------------------------------------------------------------

export const INVENTORY_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'pantry',
  'frozen',
  'other',
] as const;

export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];

// ---------------------------------------------------------------------------
// Meal Types
// ---------------------------------------------------------------------------

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'any'] as const;

export type MealType = typeof MEAL_TYPES[number];
