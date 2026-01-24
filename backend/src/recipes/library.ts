import { query } from '../db';
import { ingredientSignature, normalizeIngredientName, jaccard } from './normalize';
import type { InventoryItemLike, LibraryRecipeRow } from './scoring';

export type RecipeInsert = {
  title: string;
  description?: string | null;
  ingredients: any[];
  instructions: any[];
  prepTime?: number | null;
  cookTime?: number | null;
  calories?: number | null;
  servings?: number | null;
  tags?: string[];
  mealType?: string | null;
  cuisine?: string | null;
  dietTags?: string[];
  allergens?: string[];
  source?: 'generated' | 'curated' | 'user_submitted';
  createdByUserId?: string | null;
};

function safeStringArray(x: any): string[] {
  return Array.isArray(x) ? x.filter((v) => typeof v === 'string') : [];
}

function extractIngredientNames(ingredients: any): string[] {
  if (!Array.isArray(ingredients)) return [];
  const names: string[] = [];
  for (const it of ingredients) {
    const name = typeof it?.name === 'string' ? it.name : '';
    if (name) names.push(name);
  }
  return names;
}

export async function fetchLibraryCandidates(params: {
  mealType?: string;
  maxTotalTimeMinutes?: number;
  mustIncludeIngredient?: string;
  limit?: number;
}): Promise<LibraryRecipeRow[]> {
  const limit = Math.max(1, Math.min(50, params.limit ?? 30));
  const mealType = (params.mealType || 'any').toString().toLowerCase().trim();
  const mustInclude = (params.mustIncludeIngredient || '').toString().trim();
  const maxTotal = typeof params.maxTotalTimeMinutes === 'number' ? Math.max(1, params.maxTotalTimeMinutes) : undefined;

  const where: string[] = [];
  const values: any[] = [];

  if (mealType && mealType !== 'any') {
    values.push(mealType);
    where.push('(lower(coalesce(meal_type, \'\')) = $' + values.length + ' OR meal_type IS NULL)');
  }

  if (typeof maxTotal === 'number') {
    values.push(maxTotal);
    where.push('(coalesce(prep_time,0) + coalesce(cook_time,0)) <= $' + values.length);
  }

  if (mustInclude) {
    values.push('%' + mustInclude.toLowerCase() + '%');
    where.push('array_to_string(ingredient_names, \' \' ) ILIKE $' + values.length);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
      title,
      description,
      ingredients,
      instructions,
      ingredient_names,
      ingredient_signature,
      cuisine,
      meal_type,
      diet_tags,
      allergens,
      prep_time,
      cook_time,
      servings,
      calories,
      quality_score,
      usage_count,
      save_count,
      thumbs_up,
      thumbs_down
    FROM recipe_library
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  const result = await query(sql, values);
  return result.rows as LibraryRecipeRow[];
}

export async function incrementUsage(recipeId: string): Promise<void> {
  await query('UPDATE recipe_library SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1', [recipeId]);
}

export async function insertIntoLibrary(insert: RecipeInsert): Promise<{ id: string; ingredientSignature: string } | null> {
  const ingredientNames = extractIngredientNames(insert.ingredients);
  const signature = ingredientSignature(ingredientNames);

  const dietTags = safeStringArray(insert.dietTags).map((t) => t.toLowerCase().trim()).filter(Boolean);
  const allergens = safeStringArray(insert.allergens).map((t) => t.toLowerCase().trim()).filter(Boolean);

  const result = await query(
    `INSERT INTO recipe_library (
      title, description, ingredients, instructions,
      ingredient_names, ingredient_signature,
      cuisine, meal_type, diet_tags, allergens,
      prep_time, cook_time, servings, calories,
      source, created_by_user_id
    )
    VALUES (
      $1, $2, $3::jsonb, $4::jsonb,
      $5::text[], $6,
      $7, $8, $9::text[], $10::text[],
      $11, $12, $13, $14,
      $15, $16
    )
    RETURNING id`,
    [
      insert.title,
      insert.description ?? null,
      JSON.stringify(insert.ingredients || []),
      JSON.stringify(insert.instructions || []),
      ingredientNames,
      signature || null,
      insert.cuisine ?? null,
      insert.mealType ? insert.mealType.toLowerCase().trim() : null,
      dietTags,
      allergens,
      insert.prepTime ?? null,
      insert.cookTime ?? null,
      insert.servings ?? null,
      insert.calories ?? null,
      insert.source ?? 'generated',
      insert.createdByUserId ?? null,
    ]
  );

  const id = result.rows?.[0]?.id;
  if (!id) return null;
  return { id, ingredientSignature: signature };
}

export async function isNearDuplicateByIngredients(params: {
  ingredientNames: string[];
  threshold: number;
  limit?: number;
}): Promise<boolean> {
  const normalized = (params.ingredientNames || []).map(normalizeIngredientName).filter(Boolean);
  const setA = new Set(normalized);
  if (setA.size === 0) return false;

  // Pull a small recent sample; keep it cheap.
  const limit = Math.max(5, Math.min(50, params.limit ?? 30));
  const result = await query(
    `SELECT ingredient_names FROM recipe_library ORDER BY updated_at DESC LIMIT ${limit}`
  );

  for (const row of result.rows || []) {
    const names: string[] = Array.isArray(row.ingredient_names)
      ? (row.ingredient_names.filter((v: any) => typeof v === 'string') as string[])
      : [];
    const setB = new Set<string>(names.map(normalizeIngredientName).filter(Boolean));
    const score = jaccard(setA, setB);
    if (score >= params.threshold) return true;
  }

  return false;
}

export function inventorySummaryText(inventory: InventoryItemLike[]): string {
  return (inventory || [])
    .map((i) => `${i.quantity ? String(i.quantity) + ' ' : ''}${i.name}`.trim())
    .filter(Boolean)
    .join(', ');
}
