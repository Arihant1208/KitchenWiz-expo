/**
 * Weekly Meal Plan Optimizer
 *
 * Provides variety penalties, effort balancing, and ingredient reuse
 * optimization for 7-day meal planning.
 */

import type { RankedCandidate } from './scoring';

export interface DaySlot {
  day: string; // Monday, Tuesday, ...
  mealType: 'breakfast' | 'lunch' | 'dinner';
}

export interface WeeklyContext {
  /** Already assigned recipe IDs this week */
  usedRecipeIds: Set<string>;

  /** Map of (cuisine | mealType tag) -> count of uses this week for variety tracking */
  cuisineCounts: Map<string, number>;

  /** Map of protein type -> count for protein variety */
  proteinCounts: Map<string, number>;

  /** Total "effort minutes" (prep + cook) assigned so far this week */
  totalEffortMinutes: number;

  /** Target average effort per slot for balancing (e.g., 35 min) */
  targetEffortPerSlot: number;

  /** All ingredients used across the week for ingredient reuse bonus */
  usedIngredients: Set<string>;
}

/**
 * Calculate variety penalty for a candidate recipe based on weekly context.
 * Returns a value in [0, 1] where 0 = maximum penalty, 1 = no penalty.
 */
export function computeVarietyScore(
  candidate: RankedCandidate,
  context: WeeklyContext
): number {
  const recipe = candidate.recipe;
  let penalties = 0;
  const maxPenalties = 4; // Number of penalty factors

  // 1) Cuisine repetition penalty
  const cuisineTag = (recipe.cuisine || '').toLowerCase().trim();
  if (cuisineTag) {
    const cuisineUses = context.cuisineCounts.get(cuisineTag) || 0;
    // Penalty increases with more repetition
    penalties += Math.min(cuisineUses * 0.15, 0.5);
  }

  // 2) Protein repetition penalty
  const ingredientNames: string[] = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((i: any) => (i?.name || '').toLowerCase())
    : [];

  const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu', 'turkey', 'lamb'];
  for (const protein of proteins) {
    if (ingredientNames.some((n) => n.includes(protein))) {
      const proteinUses = context.proteinCounts.get(protein) || 0;
      if (proteinUses >= 2) {
        penalties += 0.3; // Strong penalty for 3rd+ use of same protein
      } else if (proteinUses === 1) {
        penalties += 0.1; // Mild penalty for 2nd use
      }
      break; // Only count primary protein
    }
  }

  // 3) Already-used recipe penalty (strong)
  if (context.usedRecipeIds.has(recipe.id)) {
    penalties += 1.0; // Full penalty for exact repeat
  }

  // 4) Ingredient reuse bonus (negative penalty = boost)
  const reuseCount = ingredientNames.filter((n) =>
    context.usedIngredients.has(n)
  ).length;
  const reuseBonus = Math.min(reuseCount * 0.05, 0.2); // Up to 0.2 bonus
  penalties -= reuseBonus;

  // Clamp penalty ratio
  const penaltyRatio = Math.max(0, Math.min(penalties, maxPenalties)) / maxPenalties;

  return 1 - penaltyRatio;
}

/**
 * Calculate effort balance score for a candidate.
 * Penalizes recipes that would push weekly effort too far from target.
 * Returns value in [0, 1].
 */
export function computeEffortBalance(
  candidate: RankedCandidate,
  context: WeeklyContext,
  slotsSoFar: number
): number {
  const recipe = candidate.recipe;
  const recipeEffort =
    (typeof recipe.prep_time === 'number' ? recipe.prep_time : 0) +
    (typeof recipe.cook_time === 'number' ? recipe.cook_time : 0);

  // What would be the new average if we add this recipe?
  const newTotal = context.totalEffortMinutes + recipeEffort;
  const newAvg = newTotal / (slotsSoFar + 1);
  const targetAvg = context.targetEffortPerSlot;

  // Deviation from target
  const deviation = Math.abs(newAvg - targetAvg);
  const maxDeviation = targetAvg; // 100% deviation = full penalty

  // Convert to score: 0 deviation = 1.0, maxDeviation = 0.0
  return Math.max(0, 1 - deviation / maxDeviation);
}

/**
 * Combine all weekly optimization factors into final adjustment.
 *
 * @param candidate The ranked candidate
 * @param context The weekly context
 * @param slotIndex How many slots have been filled (0-20)
 * @returns A multiplier in [0.5, 1.2] to apply to composite score
 */
export function computeWeeklyAdjustment(
  candidate: RankedCandidate,
  context: WeeklyContext,
  slotIndex: number
): number {
  const varietyScore = computeVarietyScore(candidate, context);
  const effortScore = computeEffortBalance(candidate, context, slotIndex);

  // Weighted combination
  const weights = {
    variety: 0.6,
    effort: 0.4,
  };

  const combined =
    varietyScore * weights.variety + effortScore * weights.effort;

  // Map [0, 1] -> [0.5, 1.2] adjustment range
  // 0.0 (worst) -> 0.5x multiplier
  // 1.0 (best)  -> 1.2x multiplier
  return 0.5 + combined * 0.7;
}

/**
 * Update weekly context after selecting a recipe for a slot.
 */
export function updateWeeklyContext(
  context: WeeklyContext,
  recipe: any
): void {
  // Track used recipe ID
  context.usedRecipeIds.add(recipe.id);

  // Track cuisine
  const cuisine = (recipe.cuisine || '').toLowerCase().trim();
  if (cuisine) {
    context.cuisineCounts.set(cuisine, (context.cuisineCounts.get(cuisine) || 0) + 1);
  }

  // Track protein usage
  const ingredientNames: string[] = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((i: any) => (i?.name || '').toLowerCase())
    : [];

  const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu', 'turkey', 'lamb'];
  for (const protein of proteins) {
    if (ingredientNames.some((n) => n.includes(protein))) {
      context.proteinCounts.set(protein, (context.proteinCounts.get(protein) || 0) + 1);
      break;
    }
  }

  // Track ingredient usage
  for (const name of ingredientNames) {
    if (name.trim()) {
      context.usedIngredients.add(name.trim());
    }
  }

  // Track effort
  const effort =
    (typeof recipe.prep_time === 'number' ? recipe.prep_time : 0) +
    (typeof recipe.cook_time === 'number' ? recipe.cook_time : 0);
  context.totalEffortMinutes += effort;
}

/**
 * Create initial weekly context.
 */
export function createWeeklyContext(targetEffortPerSlot = 35): WeeklyContext {
  return {
    usedRecipeIds: new Set(),
    cuisineCounts: new Map(),
    proteinCounts: new Map(),
    totalEffortMinutes: 0,
    targetEffortPerSlot,
    usedIngredients: new Set(),
  };
}

/**
 * Re-rank candidates using weekly optimization factors.
 *
 * @param candidates Already-ranked candidates from scoring module
 * @param context Weekly context
 * @param slotIndex Current slot index
 * @returns Candidates sorted by adjusted score
 */
export function applyWeeklyOptimization(
  candidates: RankedCandidate[],
  context: WeeklyContext,
  slotIndex: number
): RankedCandidate[] {
  return candidates
    .map((c) => {
      const adjustment = computeWeeklyAdjustment(c, context, slotIndex);
      return {
        ...c,
        compositeScore: c.compositeScore * adjustment,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
