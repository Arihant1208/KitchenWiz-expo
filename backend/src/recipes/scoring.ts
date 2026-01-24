import { normalizeIngredientName } from './normalize';

export type InventoryItemLike = { name: string; quantity?: string };

export type UserLike = {
  cuisinePreferences?: string[];
  dietaryRestrictions?: string[];
  allergies?: string[];
  maxCookingTime?: number;
  householdSize?: number;
};

export type RecipePrefsLike = {
  servings?: number;
  maxTimeMinutes?: number;
  mealType?: string;
  cravings?: string;
  mustIncludeIngredient?: string;
};

export type LibraryRecipeRow = {
  id: string;
  title: string;
  description: string | null;
  ingredients: any;
  instructions: any;
  ingredient_names: string[];
  ingredient_signature: string | null;
  cuisine: string | null;
  meal_type: string | null;
  diet_tags: string[];
  allergens: string[];
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  calories: number | null;
  quality_score: number | null;
  usage_count: number;
  save_count: number;
  thumbs_up: number;
  thumbs_down: number;
};

export type RankedCandidate = {
  recipe: LibraryRecipeRow;
  inventoryCoverage: number;
  missingCount: number;
  preferenceScore: number;
  qualityScore: number;
  compositeScore: number;
  missingIngredients: string[];
};

function safeArray<T>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function computeInventoryCoverage(
  recipeIngredientNames: string[],
  inventory: InventoryItemLike[]
): { coverage: number; missing: string[] } {
  const invSet = new Set(
    (inventory || [])
      .map((i) => normalizeIngredientName(i?.name))
      .filter(Boolean)
  );

  const normalizedRecipe = (recipeIngredientNames || [])
    .map(normalizeIngredientName)
    .filter(Boolean);

  if (normalizedRecipe.length === 0) {
    return { coverage: 0, missing: [] };
  }

  const missing: string[] = [];
  let have = 0;

  for (const ing of normalizedRecipe) {
    if (invSet.has(ing)) {
      have += 1;
    } else {
      missing.push(ing);
    }
  }

  return { coverage: have / normalizedRecipe.length, missing };
}

export function computeQualityScore(row: LibraryRecipeRow): number {
  const base = row.quality_score;
  const base01 = typeof base === 'number' ? clamp01(base) : 0.55;

  // Feedback influence (small, bounded): upvotes/downvotes.
  const up = Number(row.thumbs_up || 0);
  const down = Number(row.thumbs_down || 0);
  const total = up + down;
  const ratio = total > 0 ? up / total : 0.5;
  const feedbackBoost = (ratio - 0.5) * 0.2; // +/- 0.1 max

  // Usage acts as light confidence (log-ish, bounded).
  const usage = Math.max(0, Number(row.usage_count || 0));
  const usageBoost = Math.min(0.05, Math.log10(usage + 1) * 0.03);

  return clamp01(base01 + feedbackBoost + usageBoost);
}

export function computePreferenceScore(
  row: LibraryRecipeRow,
  user: UserLike,
  prefs: RecipePrefsLike
): number {
  let score = 0;
  let denom = 0;

  const mealType = (prefs.mealType || 'any').toString().toLowerCase().trim();
  if (mealType && mealType !== 'any') {
    denom += 1;
    const rowMeal = (row.meal_type || '').toString().toLowerCase().trim();
    score += rowMeal === mealType ? 1 : 0;
  }

  const mustInclude = (prefs.mustIncludeIngredient || '').toString().trim();
  if (mustInclude) {
    denom += 1;
    const normalizedMust = normalizeIngredientName(mustInclude);
    const ingSet = new Set((row.ingredient_names || []).map(normalizeIngredientName));
    score += ingSet.has(normalizedMust) ? 1 : 0;
  }

  const cuisines = safeArray<string>(user?.cuisinePreferences)
    .map((c) => c.toLowerCase().trim())
    .filter(Boolean);
  if (cuisines.length > 0) {
    denom += 1;
    const rowCuisine = (row.cuisine || '').toString().toLowerCase().trim();
    score += rowCuisine && cuisines.includes(rowCuisine) ? 1 : 0.4;
  }

  return denom === 0 ? 0.5 : clamp01(score / denom);
}

export function rankCandidates(
  candidates: LibraryRecipeRow[],
  inventory: InventoryItemLike[],
  user: UserLike,
  prefs: RecipePrefsLike
): RankedCandidate[] {
  return (candidates || []).map((row) => {
    const { coverage, missing } = computeInventoryCoverage(row.ingredient_names || [], inventory);
    const quality = computeQualityScore(row);
    const preference = computePreferenceScore(row, user, prefs);

    // Composite weights chosen to prioritize inventory use.
    const composite = clamp01(coverage * 0.55 + quality * 0.25 + preference * 0.20);

    return {
      recipe: row,
      inventoryCoverage: coverage,
      missingCount: missing.length,
      preferenceScore: preference,
      qualityScore: quality,
      compositeScore: composite,
      missingIngredients: missing,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

export function shouldReuse(top: RankedCandidate | undefined): boolean {
  if (!top) return false;
  return top.compositeScore >= 0.78 && top.missingCount <= 3;
}
