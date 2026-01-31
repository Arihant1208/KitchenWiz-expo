/**
 * Recipe Mappers
 *
 * Transform recipe data between database and API formats.
 */

import type { LibraryRecipeRow, RankedCandidate } from '../recipes/scoring';

export interface RecipeResponse {
  id: string;
  title: string;
  description: string | null;
  ingredients: any[];
  instructions: any[];
  prepTime: number | null;
  cookTime: number | null;
  calories: number | null;
  matchScore: number;
  tags: string[];
}

/**
 * Map a library recipe row to API response format.
 */
export function mapLibraryRowToRecipe(
  row: LibraryRecipeRow,
  fallbackServings: number,
  matchScore = 0
): RecipeResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    ingredients: row.ingredients,
    instructions: row.instructions,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    calories: row.calories,
    matchScore,
    tags: buildRecipeTags(row, fallbackServings),
  };
}

/**
 * Map a ranked candidate to API response format.
 */
export function mapRankedCandidateToRecipe(
  candidate: RankedCandidate,
  fallbackServings: number
): RecipeResponse {
  const matchScore = Math.round(candidate.inventoryCoverage * 100);
  return mapLibraryRowToRecipe(candidate.recipe, fallbackServings, matchScore);
}

/**
 * Build tags array from recipe row.
 */
export function buildRecipeTags(row: LibraryRecipeRow, servings: number): string[] {
  return [
    ...(Array.isArray(row.diet_tags) ? row.diet_tags : []),
    ...(row.meal_type ? [row.meal_type] : []),
    ...(row.cuisine ? [row.cuisine] : []),
    `serves ${row.servings || servings}`,
  ].filter(Boolean);
}

/**
 * Map generated recipe (from LLM) to API response format.
 */
export function mapGeneratedRecipe(
  recipe: any,
  id: string,
  tags: string[] = []
): RecipeResponse {
  return {
    id,
    title: recipe.title || 'Untitled',
    description: recipe.description || null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    prepTime: Number.isFinite(recipe.prepTime) ? recipe.prepTime : null,
    cookTime: Number.isFinite(recipe.cookTime) ? recipe.cookTime : null,
    calories: Number.isFinite(recipe.calories) ? recipe.calories : null,
    matchScore: Number.isFinite(recipe.matchScore) ? recipe.matchScore : 0,
    tags: Array.isArray(recipe.tags) ? recipe.tags : tags,
  };
}
