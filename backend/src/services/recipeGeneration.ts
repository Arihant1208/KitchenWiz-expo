/**
 * Recipe Generation Service
 *
 * Handles recipe retrieval, ranking, and generation logic.
 */

import { generateJson, buildUserContext, type UserContext } from './ai';
import {
  fetchLibraryCandidates,
  incrementUsage,
  insertIntoLibrary,
  inventorySummaryText,
  isNearDuplicateByIngredients,
} from '../recipes/library';
import { rankCandidates, shouldReuse, type RankedCandidate } from '../recipes/scoring';
import {
  createWeeklyContext,
  updateWeeklyContext,
  applyWeeklyOptimization,
  type WeeklyContext,
} from '../recipes/weeklyOptimizer';
import { mapLibraryRowToRecipe, mapRankedCandidateToRecipe, type RecipeResponse } from '../mappers';
import { randomId } from '../helpers';
import { WEEK_DAYS, TARGET_EFFORT_PER_SLOT } from '../constants';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipePreferences {
  servings: number;
  maxTimeMinutes: number;
  mealType: string;
  cravings?: string;
  mustIncludeIngredient?: string;
}

export interface InventoryItem {
  name: string;
  quantity?: string;
}

export interface GenerateRecipesResult {
  recipes: RecipeResponse[];
  mode: 'reuse' | 'generate';
  telemetry: {
    candidateCount: number;
    topScore?: number;
    gateReason?: string;
  };
}

export interface DayMealPlan {
  day: string;
  breakfast?: RecipeResponse;
  lunch?: RecipeResponse;
  dinner?: RecipeResponse;
}

// ---------------------------------------------------------------------------
// Telemetry Helpers
// ---------------------------------------------------------------------------

function logRankingTelemetry(ranked: RankedCandidate[], log: any): void {
  if (ranked.length === 0) return;

  const scores = ranked.map((c) => c.compositeScore);
  const top = ranked[0];

  log.info(
    {
      action: 'recipe_ranking_telemetry',
      candidateCount: ranked.length,
      scoreDistribution: {
        min: Math.min(...scores).toFixed(3),
        max: Math.max(...scores).toFixed(3),
        median: scores[Math.floor(scores.length / 2)]?.toFixed(3),
      },
      topCandidate: {
        id: top.recipe.id,
        compositeScore: top.compositeScore.toFixed(3),
        inventoryCoverage: top.inventoryCoverage.toFixed(3),
        preferenceScore: top.preferenceScore.toFixed(3),
        qualityScore: top.qualityScore.toFixed(3),
        missingCount: top.missingCount,
      },
    },
    'Recipe ranking completed'
  );
}

function getGateFailureReason(ranked: RankedCandidate[]): string {
  if (ranked.length === 0) return 'no_candidates';
  if (ranked[0].compositeScore < 0.78) return 'score_below_threshold';
  if (ranked[0].missingCount > 3) return 'too_many_missing_ingredients';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Recipe Generation
// ---------------------------------------------------------------------------

/**
 * Generate recipes from inventory - attempts reuse first, falls back to generation.
 */
export async function generateRecipesFromInventory(
  inventory: InventoryItem[],
  user: UserContext,
  prefs: RecipePreferences,
  log: any,
  userId?: string
): Promise<GenerateRecipesResult> {
  const inventoryList = inventorySummaryText(inventory);

  // 1) Retrieve + rank from library
  const candidates = await fetchLibraryCandidates({
    mealType: prefs.mealType,
    maxTotalTimeMinutes: prefs.maxTimeMinutes,
    mustIncludeIngredient: prefs.mustIncludeIngredient || '',
    limit: 30,
  });

  const ranked = rankCandidates(candidates, inventory, user, {
    servings: prefs.servings,
    maxTimeMinutes: prefs.maxTimeMinutes,
    mealType: prefs.mealType,
    cravings: prefs.cravings || '',
    mustIncludeIngredient: prefs.mustIncludeIngredient || '',
  });

  // Log telemetry
  logRankingTelemetry(ranked, log);

  // 2) Check reuse gate
  if (shouldReuse(ranked[0])) {
    const top3 = ranked.slice(0, 3);

    // Track usage (best-effort)
    for (const r of top3) {
      incrementUsage(r.recipe.id).catch(() => undefined);
    }

    log.info(
      {
        action: 'recipes_from_inventory',
        mode: 'reuse',
        selectedCount: top3.length,
        recipeIds: top3.map((r) => r.recipe.id),
      },
      'Reusing recipes from library'
    );

    return {
      recipes: top3.map((c) => mapRankedCandidateToRecipe(c, prefs.servings)),
      mode: 'reuse',
      telemetry: {
        candidateCount: ranked.length,
        topScore: ranked[0]?.compositeScore,
      },
    };
  }

  // 3) Generate (fallback)
  const gateReason = getGateFailureReason(ranked);

  log.info(
    {
      action: 'recipes_from_inventory',
      mode: 'generate',
      reason: gateReason,
      candidateCount: ranked.length,
      topScore: ranked[0]?.compositeScore?.toFixed(3) ?? null,
      topMissingCount: ranked[0]?.missingCount ?? null,
    },
    'Generating recipes from inventory'
  );

  const prompt = buildRecipeGenerationPrompt(inventoryList, user, prefs);
  const generated = await generateJson<any[]>({ prompt });
  const recipes = Array.isArray(generated) ? generated : [];

  // 4) Store best recipe (deduped)
  const best = recipes
    .slice()
    .sort((a, b) => Number(b?.matchScore ?? 0) - Number(a?.matchScore ?? 0))[0];

  if (best && typeof best === 'object') {
    await storeGeneratedRecipe(best, user, prefs, userId);
  }

  return {
    recipes: recipes.slice(0, 3).map((r) => ({
      ...r,
      id: r?.id || randomId(),
    })),
    mode: 'generate',
    telemetry: {
      candidateCount: ranked.length,
      gateReason,
    },
  };
}

/**
 * Build the recipe generation prompt.
 */
function buildRecipeGenerationPrompt(
  inventoryList: string,
  user: UserContext,
  prefs: RecipePreferences
): string {
  const userContext = buildUserContext(user);

  return `
I have these ingredients: ${inventoryList}.
My profile:
${userContext}

Recipe preferences:
- Servings (number of people): ${prefs.servings}
- Max total time (prep + cook): ${prefs.maxTimeMinutes} minutes
- Meal type: ${prefs.mealType}
- Cravings / mood: ${prefs.cravings || 'None specified'}
- Must include this ingredient if possible: ${prefs.mustIncludeIngredient || 'None'}

Suggest 3 creative recipes that prioritize using my existing stock to reduce waste.
Keep each recipe within the max total time (${prefs.maxTimeMinutes} minutes).
If a meal type is provided (not "any"), make recipes appropriate for that meal type.
If a must-include ingredient is provided, include it in each recipe when reasonable.
Rate each recipe with a 'matchScore' (0-100) based on how many ingredients I already have vs need to buy.

In the 'tags' array, include helpful short tags such as: cuisine, meal type, "serves ${prefs.servings}", cravings keywords (if any), and dietary-friendly tags when appropriate.

Return ONLY a valid JSON array with objects containing:
- title (string)
- description (string)
- ingredients (array of {name: string, amount: string})
- instructions (array of strings)
- prepTime (number in minutes)
- cookTime (number in minutes)
- calories (number)
- matchScore (number 0-100)
- tags (array of strings)
`;
}

/**
 * Store a generated recipe in the library (with deduplication).
 */
async function storeGeneratedRecipe(
  recipe: any,
  user: UserContext,
  prefs: RecipePreferences,
  userId?: string
): Promise<string | null> {
  const ingredientNames = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((x: any) => x?.name).filter((n: any) => typeof n === 'string')
    : [];

  const isDup = await isNearDuplicateByIngredients({
    ingredientNames,
    threshold: 0.85,
    limit: 30,
  });

  if (isDup) return null;

  const inserted = await insertIntoLibrary({
    title: String(recipe.title || '').trim() || 'Untitled recipe',
    description: typeof recipe.description === 'string' ? recipe.description : null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    prepTime: Number.isFinite(recipe.prepTime) ? Number(recipe.prepTime) : null,
    cookTime: Number.isFinite(recipe.cookTime) ? Number(recipe.cookTime) : null,
    calories: Number.isFinite(recipe.calories) ? Number(recipe.calories) : null,
    servings: prefs.servings,
    mealType: prefs.mealType !== 'any' ? prefs.mealType : null,
    dietTags: Array.isArray(user?.dietaryRestrictions) ? user.dietaryRestrictions : [],
    allergens: Array.isArray(user?.allergies) ? user.allergies : [],
    source: 'generated',
    createdByUserId: userId || null,
  });

  if (inserted?.id) {
    recipe.id = inserted.id;
    return inserted.id;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Weekly Meal Plan Generation
// ---------------------------------------------------------------------------

/**
 * Generate a weekly meal plan.
 */
export async function generateWeeklyMealPlan(
  inventory: InventoryItem[],
  user: UserContext,
  log: any,
  userId?: string
): Promise<DayMealPlan[]> {
  const maxTimeMinutes = Math.max(10, Math.round(user.maxCookingTime || 60));
  const servings = Math.max(1, Math.round(user.householdSize || 1));

  const weeklyContext = createWeeklyContext(TARGET_EFFORT_PER_SLOT);
  const days: DayMealPlan[] = [];
  let slotIndex = 0;

  for (const dayName of WEEK_DAYS) {
    const breakfast = await getRecipeForSlot({
      inventory,
      user,
      mealType: 'breakfast',
      maxTimeMinutes,
      servings,
      weeklyContext,
      slotIndex: slotIndex++,
      log,
      userId,
    });

    const lunch = await getRecipeForSlot({
      inventory,
      user,
      mealType: 'lunch',
      maxTimeMinutes,
      servings,
      weeklyContext,
      slotIndex: slotIndex++,
      log,
      userId,
    });

    const dinner = await getRecipeForSlot({
      inventory,
      user,
      mealType: 'dinner',
      maxTimeMinutes,
      servings,
      weeklyContext,
      slotIndex: slotIndex++,
      log,
      userId,
    });

    days.push({
      day: dayName,
      breakfast: breakfast ? { ...breakfast, id: breakfast.id || randomId() } : undefined,
      lunch: lunch ? { ...lunch, id: lunch.id || randomId() } : undefined,
      dinner: dinner ? { ...dinner, id: dinner.id || randomId() } : undefined,
    });
  }

  return days;
}

interface GetRecipeForSlotParams {
  inventory: InventoryItem[];
  user: UserContext;
  mealType: string;
  maxTimeMinutes: number;
  servings: number;
  weeklyContext: WeeklyContext;
  slotIndex: number;
  log: any;
  userId?: string;
}

/**
 * Get a recipe for a specific meal slot.
 */
async function getRecipeForSlot(params: GetRecipeForSlotParams): Promise<RecipeResponse | null> {
  const {
    inventory,
    user,
    mealType,
    maxTimeMinutes,
    servings,
    weeklyContext,
    slotIndex,
    log,
    userId,
  } = params;

  // Fetch and rank candidates
  const candidates = await fetchLibraryCandidates({
    mealType,
    maxTotalTimeMinutes: maxTimeMinutes,
    mustIncludeIngredient: '',
    limit: 30,
  });

  const ranked = rankCandidates(candidates, inventory, user, {
    servings,
    maxTimeMinutes,
    mealType,
    cravings: '',
    mustIncludeIngredient: '',
  });

  // Apply weekly optimization
  const optimized = applyWeeklyOptimization(ranked, weeklyContext, slotIndex);
  const reusable = optimized.filter(
    (c) => shouldReuse(c) && !weeklyContext.usedRecipeIds.has(c.recipe.id)
  );
  const chosenReusable = reusable[0];

  if (chosenReusable) {
    incrementUsage(chosenReusable.recipe.id).catch(() => undefined);
    const mapped = mapLibraryRowToRecipe(
      chosenReusable.recipe,
      servings,
      Math.round(chosenReusable.inventoryCoverage * 100)
    );

    updateWeeklyContext(weeklyContext, chosenReusable.recipe);

    log.info(
      {
        action: 'weekly_meal_plan_slot',
        mealType,
        mode: 'reuse',
        slotIndex,
        recipeId: chosenReusable.recipe.id,
        varietyAdjusted: true,
      },
      'Selected recipe for slot'
    );

    return mapped;
  }

  // Generate fallback
  const recipe = await generateSingleRecipe(inventory, user, mealType, maxTimeMinutes, servings, log, userId);

  if (recipe) {
    updateWeeklyContext(weeklyContext, {
      id: recipe.id,
      ingredients: recipe.ingredients || [],
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      cuisine: null,
    });
  }

  return recipe;
}

/**
 * Generate a single recipe for a slot.
 */
async function generateSingleRecipe(
  inventory: InventoryItem[],
  user: UserContext,
  mealType: string,
  maxTimeMinutes: number,
  servings: number,
  log: any,
  userId?: string
): Promise<RecipeResponse | null> {
  const inventoryList = inventorySummaryText(inventory);
  const userContext = buildUserContext(user);

  const prompt = `
I have these ingredients: ${inventoryList}.
My profile:
${userContext}

Create ONE recipe suitable for ${mealType}.
- Servings: ${servings}
- Max total time (prep + cook): ${maxTimeMinutes} minutes

Prioritize using my existing ingredients.

Return ONLY a valid JSON object with:
- title (string)
- description (string)
- ingredients (array of {name: string, amount: string})
- instructions (array of strings)
- prepTime (number in minutes)
- cookTime (number in minutes)
- calories (number)
`;

  log.info(
    {
      action: 'weekly_meal_plan_slot',
      mealType,
      mode: 'generate',
      maxTimeMinutes,
      servings,
    },
    'Generating recipe for slot'
  );

  try {
    const recipe = await generateJson<any>({ prompt });

    if (!recipe || typeof recipe !== 'object') {
      return null;
    }

    // Store with deduplication
    await storeGeneratedRecipe(
      recipe,
      user,
      { servings, maxTimeMinutes, mealType },
      userId
    );

    return {
      id: recipe.id || randomId(),
      title: recipe.title || 'Untitled',
      description: recipe.description || null,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      prepTime: recipe.prepTime ?? null,
      cookTime: recipe.cookTime ?? null,
      calories: recipe.calories ?? null,
      matchScore: 0,
      tags: [],
    };
  } catch (err) {
    log.error({ err, mealType }, 'Failed to generate single recipe');
    return null;
  }
}
