/**
 * Taste Embedding System
 *
 * Manages user taste profiles and recipe embeddings for preference-aware ranking.
 * Uses exponential moving average (EMA) to update user taste from interaction signals.
 */

import { query } from '../db';

// ---------------------------------------------------------------------------
// Embedding Dimensions (latent preference axes)
// ---------------------------------------------------------------------------

export const EMBEDDING_DIMENSIONS = [
  'cuisine_italian',
  'cuisine_asian',
  'cuisine_mexican',
  'cuisine_indian',
  'cuisine_american',
  'cuisine_mediterranean',
  'flavor_spicy',
  'flavor_savory',
  'flavor_sweet',
  'flavor_sour',
  'protein_chicken',
  'protein_beef',
  'protein_fish',
  'protein_vegetarian',
  'protein_pork',
  'method_grilled',
  'method_baked',
  'method_fried',
  'method_steamed',
  'method_raw',
  'complexity_simple',
  'complexity_moderate',
  'complexity_complex',
  'time_quick',
  'time_medium',
  'time_long',
] as const;

export type EmbeddingDimension = (typeof EMBEDDING_DIMENSIONS)[number];

export const EMBEDDING_SIZE = EMBEDDING_DIMENSIONS.length;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TasteEmbedding = number[];

export interface UserTasteProfile {
  userId: string;
  embedding: TasteEmbedding;
  interactionCount: number;
  updatedAt: Date;
}

export interface RecipeEmbeddingRow {
  recipeId: string;
  embedding: TasteEmbedding;
  computedAt: Date;
}

export interface InteractionSignal {
  userId: string;
  recipeId: string;
  signalType: 'cooked' | 'skipped' | 'thumbs_up' | 'thumbs_down' | 'repeated' | 'edited';
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// ---------------------------------------------------------------------------
// Embedding Utilities
// ---------------------------------------------------------------------------

/** Create a zero-initialized embedding vector. */
export function zeroEmbedding(): TasteEmbedding {
  return new Array(EMBEDDING_SIZE).fill(0);
}

/** Normalize a vector to unit length. */
export function normalize(vec: TasteEmbedding): TasteEmbedding {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag === 0) return vec.slice();
  return vec.map((v) => v / mag);
}

/** Cosine similarity between two embeddings (assumes normalized or handles magnitude). */
export function cosineSimilarity(a: TasteEmbedding, b: TasteEmbedding): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Exponential moving average update. */
export function emaUpdate(
  current: TasteEmbedding,
  signal: TasteEmbedding,
  alpha: number = 0.1
): TasteEmbedding {
  if (current.length !== signal.length) {
    throw new Error('Embedding dimension mismatch');
  }
  return current.map((c, i) => c * (1 - alpha) + signal[i] * alpha);
}

// ---------------------------------------------------------------------------
// Recipe Embedding Generation (Rule-based; can be replaced with ML later)
// ---------------------------------------------------------------------------

const CUISINE_MAP: Record<string, EmbeddingDimension> = {
  italian: 'cuisine_italian',
  asian: 'cuisine_asian',
  chinese: 'cuisine_asian',
  japanese: 'cuisine_asian',
  thai: 'cuisine_asian',
  korean: 'cuisine_asian',
  vietnamese: 'cuisine_asian',
  mexican: 'cuisine_mexican',
  indian: 'cuisine_indian',
  american: 'cuisine_american',
  mediterranean: 'cuisine_mediterranean',
  greek: 'cuisine_mediterranean',
  middle_eastern: 'cuisine_mediterranean',
};

const PROTEIN_KEYWORDS: Record<string, EmbeddingDimension> = {
  chicken: 'protein_chicken',
  turkey: 'protein_chicken',
  beef: 'protein_beef',
  steak: 'protein_beef',
  fish: 'protein_fish',
  salmon: 'protein_fish',
  tuna: 'protein_fish',
  shrimp: 'protein_fish',
  pork: 'protein_pork',
  bacon: 'protein_pork',
  tofu: 'protein_vegetarian',
  tempeh: 'protein_vegetarian',
  lentil: 'protein_vegetarian',
  chickpea: 'protein_vegetarian',
  bean: 'protein_vegetarian',
};

const METHOD_KEYWORDS: Record<string, EmbeddingDimension> = {
  grill: 'method_grilled',
  grilled: 'method_grilled',
  bake: 'method_baked',
  baked: 'method_baked',
  roast: 'method_baked',
  fry: 'method_fried',
  fried: 'method_fried',
  steam: 'method_steamed',
  steamed: 'method_steamed',
  raw: 'method_raw',
  salad: 'method_raw',
};

function indexOfDim(dim: EmbeddingDimension): number {
  return EMBEDDING_DIMENSIONS.indexOf(dim);
}

/**
 * Generate a recipe embedding from its metadata.
 * This is a heuristic approach; can be replaced with ML-generated embeddings.
 */
export function generateRecipeEmbedding(recipe: {
  title?: string;
  description?: string;
  cuisine?: string | null;
  ingredients?: Array<{ name: string }> | string[];
  instructions?: string[];
  prepTime?: number | null;
  cookTime?: number | null;
}): TasteEmbedding {
  const emb = zeroEmbedding();

  // Cuisine signal
  const cuisineLower = (recipe.cuisine || '').toLowerCase().trim();
  if (cuisineLower && CUISINE_MAP[cuisineLower]) {
    emb[indexOfDim(CUISINE_MAP[cuisineLower])] = 1;
  }

  // Analyze ingredients for protein and flavor signals
  const ingredientText = (recipe.ingredients || [])
    .map((i) => (typeof i === 'string' ? i : i.name || ''))
    .join(' ')
    .toLowerCase();

  for (const [kw, dim] of Object.entries(PROTEIN_KEYWORDS)) {
    if (ingredientText.includes(kw)) {
      emb[indexOfDim(dim)] = Math.max(emb[indexOfDim(dim)], 1);
    }
  }

  // Spicy detection
  if (/chili|jalape|cayenne|sriracha|hot sauce|spicy/i.test(ingredientText)) {
    emb[indexOfDim('flavor_spicy')] = 1;
  }

  // Sweet detection
  if (/sugar|honey|maple|sweet|chocolate|caramel/i.test(ingredientText)) {
    emb[indexOfDim('flavor_sweet')] = 1;
  }

  // Analyze instructions for cooking method
  const instructionText = (recipe.instructions || []).join(' ').toLowerCase();
  for (const [kw, dim] of Object.entries(METHOD_KEYWORDS)) {
    if (instructionText.includes(kw)) {
      emb[indexOfDim(dim)] = Math.max(emb[indexOfDim(dim)], 1);
    }
  }

  // Time-based complexity
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime <= 20) {
    emb[indexOfDim('time_quick')] = 1;
    emb[indexOfDim('complexity_simple')] = 0.8;
  } else if (totalTime <= 45) {
    emb[indexOfDim('time_medium')] = 1;
    emb[indexOfDim('complexity_moderate')] = 0.8;
  } else {
    emb[indexOfDim('time_long')] = 1;
    emb[indexOfDim('complexity_complex')] = 0.8;
  }

  // Ingredient count as complexity proxy
  const ingredientCount = (recipe.ingredients || []).length;
  if (ingredientCount <= 5) {
    emb[indexOfDim('complexity_simple')] = Math.max(emb[indexOfDim('complexity_simple')], 0.6);
  } else if (ingredientCount >= 12) {
    emb[indexOfDim('complexity_complex')] = Math.max(emb[indexOfDim('complexity_complex')], 0.6);
  }

  return normalize(emb);
}

// ---------------------------------------------------------------------------
// Signal → Embedding Conversion
// ---------------------------------------------------------------------------

/** Convert an interaction signal into a taste delta for EMA update. */
export function signalToEmbeddingDelta(
  signal: InteractionSignal,
  recipeEmbedding: TasteEmbedding
): { delta: TasteEmbedding; weight: number } {
  // Weight varies by signal type (positive/negative reinforcement)
  let weight = 0.1;
  let sign = 1;

  switch (signal.signalType) {
    case 'cooked':
      weight = 0.15;
      break;
    case 'repeated':
      weight = 0.2;
      break;
    case 'thumbs_up':
      weight = 0.25;
      break;
    case 'thumbs_down':
      weight = 0.2;
      sign = -1;
      break;
    case 'skipped':
      weight = 0.05;
      sign = -1;
      break;
    case 'edited':
      weight = 0.08;
      break;
  }

  const delta = recipeEmbedding.map((v) => v * sign);
  return { delta, weight };
}

// ---------------------------------------------------------------------------
// Database Operations
// ---------------------------------------------------------------------------

/** Fetch user taste profile; returns null if not yet created. */
export async function getUserTasteProfile(userId: string): Promise<UserTasteProfile | null> {
  const result = await query(
    `SELECT user_id, embedding, interaction_count, updated_at
     FROM user_taste_embeddings
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    userId: row.user_id,
    embedding: row.embedding,
    interactionCount: row.interaction_count,
    updatedAt: row.updated_at,
  };
}

/** Create or update user taste profile. */
export async function upsertUserTasteProfile(
  userId: string,
  embedding: TasteEmbedding,
  incrementInteraction: boolean = false
): Promise<void> {
  await query(
    `INSERT INTO user_taste_embeddings (user_id, embedding, interaction_count)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET
       embedding = $2,
       interaction_count = user_taste_embeddings.interaction_count + $4,
       updated_at = NOW()`,
    [userId, JSON.stringify(embedding), incrementInteraction ? 1 : 0, incrementInteraction ? 1 : 0]
  );
}

/** Fetch cached recipe embedding. */
export async function getRecipeEmbedding(recipeId: string): Promise<TasteEmbedding | null> {
  const result = await query(
    `SELECT embedding FROM recipe_embeddings WHERE recipe_id = $1`,
    [recipeId]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].embedding;
}

/** Cache recipe embedding. */
export async function upsertRecipeEmbedding(
  recipeId: string,
  embedding: TasteEmbedding
): Promise<void> {
  await query(
    `INSERT INTO recipe_embeddings (recipe_id, embedding)
     VALUES ($1, $2)
     ON CONFLICT (recipe_id)
     DO UPDATE SET embedding = $2, computed_at = NOW()`,
    [recipeId, JSON.stringify(embedding)]
  );
}

/** Record an interaction signal. */
export async function recordInteractionSignal(signal: InteractionSignal): Promise<void> {
  await query(
    `INSERT INTO interaction_signals (user_id, recipe_id, signal_type, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      signal.userId,
      signal.recipeId,
      signal.signalType,
      signal.metadata ? JSON.stringify(signal.metadata) : null,
    ]
  );
}

/** Apply an interaction signal to update user taste profile. */
export async function applyInteractionSignal(signal: InteractionSignal): Promise<void> {
  // 1. Get recipe embedding (compute if missing)
  let recipeEmb = await getRecipeEmbedding(signal.recipeId);

  if (!recipeEmb) {
    // Fetch recipe from library and compute embedding
    const recipeResult = await query(
      `SELECT title, description, cuisine, ingredients, instructions, prep_time, cook_time
       FROM recipe_library WHERE id = $1`,
      [signal.recipeId]
    );

    if (recipeResult.rows.length === 0) {
      // Recipe not found; skip update
      return;
    }

    const recipe = recipeResult.rows[0];
    recipeEmb = generateRecipeEmbedding({
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
    });

    await upsertRecipeEmbedding(signal.recipeId, recipeEmb);
  }

  // 2. Get current user taste profile (or initialize)
  let profile = await getUserTasteProfile(signal.userId);
  const currentEmb = profile?.embedding ?? zeroEmbedding();

  // 3. Compute delta and apply EMA
  const { delta, weight } = signalToEmbeddingDelta(signal, recipeEmb);
  const updatedEmb = emaUpdate(currentEmb, delta, weight);
  const normalizedEmb = normalize(updatedEmb);

  // 4. Persist
  await upsertUserTasteProfile(signal.userId, normalizedEmb, true);

  // 5. Record signal for analytics
  await recordInteractionSignal(signal);
}

// ---------------------------------------------------------------------------
// Novelty Scoring
// ---------------------------------------------------------------------------

/** Compute novelty bonus based on user's recent history. */
export async function computeNoveltyScore(
  userId: string,
  recipeId: string,
  windowDays: number = 14
): Promise<number> {
  // Check if recipe was interacted with recently
  const result = await query(
    `SELECT COUNT(*) as cnt FROM interaction_signals
     WHERE user_id = $1
       AND recipe_id = $2
       AND created_at > NOW() - INTERVAL '1 day' * $3`,
    [userId, recipeId, windowDays]
  );

  const count = parseInt(result.rows[0]?.cnt || '0', 10);

  // Higher novelty for less-seen recipes
  if (count === 0) return 1.0;
  if (count === 1) return 0.7;
  if (count <= 3) return 0.4;
  return 0.1;
}
