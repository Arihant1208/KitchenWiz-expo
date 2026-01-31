/**
 * Scoring Tests - Recipe Ranking Algorithm
 */

import {
  computeInventoryCoverage,
  computeQualityScore,
  computePreferenceScore,
  DEFAULT_WEIGHTS,
  type LibraryRecipeRow,
  type InventoryItemLike,
  type UserLike,
  type RecipePrefsLike,
} from '../../src/recipes/scoring';

// Mock recipe factory
function mockRecipe(overrides: Partial<LibraryRecipeRow> = {}): LibraryRecipeRow {
  return {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [{ name: 'chicken', quantity: '500g' }],
    instructions: ['Step 1'],
    ingredient_names: ['chicken', 'garlic', 'onion'],
    ingredient_signature: 'chicken|garlic|onion',
    cuisine: 'italian',
    meal_type: 'dinner',
    diet_tags: [],
    allergens: [],
    prep_time: 15,
    cook_time: 30,
    servings: 4,
    calories: 400,
    quality_score: 0.7,
    usage_count: 10,
    save_count: 5,
    thumbs_up: 8,
    thumbs_down: 2,
    ...overrides,
  };
}

describe('computeInventoryCoverage', () => {
  it('should return 1.0 when all ingredients are in inventory', () => {
    const recipe = mockRecipe({ ingredient_names: ['chicken', 'garlic', 'onion'] });
    const inventory: InventoryItemLike[] = [
      { name: 'Chicken', quantity: '500g' },
      { name: 'Garlic', quantity: '3 cloves' },
      { name: 'Onion', quantity: '2' },
    ];
    
    const { coverage, missing } = computeInventoryCoverage(recipe.ingredient_names, inventory);
    expect(coverage).toBe(1);
    expect(missing).toHaveLength(0);
  });

  it('should return 0.0 when no ingredients match', () => {
    const recipe = mockRecipe({ ingredient_names: ['beef', 'tomato'] });
    const inventory: InventoryItemLike[] = [
      { name: 'Chicken', quantity: '500g' },
      { name: 'Garlic', quantity: '3 cloves' },
    ];
    
    const { coverage, missing } = computeInventoryCoverage(recipe.ingredient_names, inventory);
    expect(coverage).toBe(0);
    expect(missing).toHaveLength(2);
  });

  it('should return partial coverage', () => {
    const recipe = mockRecipe({ ingredient_names: ['chicken', 'garlic', 'onion', 'tomato'] });
    const inventory: InventoryItemLike[] = [
      { name: 'Chicken', quantity: '500g' },
      { name: 'Garlic', quantity: '3 cloves' },
    ];
    
    const { coverage, missing } = computeInventoryCoverage(recipe.ingredient_names, inventory);
    expect(coverage).toBe(0.5);
    expect(missing).toContain('onion');
    expect(missing).toContain('tomato');
  });

  it('should handle empty inventory', () => {
    const recipe = mockRecipe({ ingredient_names: ['chicken'] });
    const { coverage, missing } = computeInventoryCoverage(recipe.ingredient_names, []);
    expect(coverage).toBe(0);
    expect(missing).toHaveLength(1);
  });

  it('should handle empty recipe ingredients', () => {
    const { coverage, missing } = computeInventoryCoverage([], [{ name: 'chicken' }]);
    expect(coverage).toBe(0);
    expect(missing).toHaveLength(0);
  });

  it('should normalize ingredient names (case insensitive)', () => {
    const recipe = mockRecipe({ ingredient_names: ['CHICKEN', 'Garlic'] });
    const inventory: InventoryItemLike[] = [
      { name: 'chicken', quantity: '500g' },
      { name: 'GARLIC', quantity: '3 cloves' },
    ];
    
    const { coverage } = computeInventoryCoverage(recipe.ingredient_names, inventory);
    expect(coverage).toBe(1);
  });
});

describe('computeQualityScore', () => {
  it('should return base quality score for neutral feedback', () => {
    const recipe = mockRecipe({
      quality_score: 0.7,
      thumbs_up: 5,
      thumbs_down: 5,
      usage_count: 0,
    });
    
    const score = computeQualityScore(recipe);
    // Base 0.7, neutral feedback (50% ratio), minimal usage
    expect(score).toBeCloseTo(0.7, 1);
  });

  it('should boost score for positive feedback', () => {
    const recipe = mockRecipe({
      quality_score: 0.7,
      thumbs_up: 10,
      thumbs_down: 0,
      usage_count: 0,
    });
    
    const score = computeQualityScore(recipe);
    // Should be higher than 0.7 due to positive feedback
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should reduce score for negative feedback', () => {
    const recipe = mockRecipe({
      quality_score: 0.7,
      thumbs_up: 0,
      thumbs_down: 10,
      usage_count: 0,
    });
    
    const score = computeQualityScore(recipe);
    // Should be lower than 0.7 due to negative feedback
    expect(score).toBeLessThan(0.7);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should boost slightly for high usage', () => {
    const recipeNoUsage = mockRecipe({
      quality_score: 0.5,
      thumbs_up: 5,
      thumbs_down: 5,
      usage_count: 0,
    });
    
    const recipeHighUsage = mockRecipe({
      quality_score: 0.5,
      thumbs_up: 5,
      thumbs_down: 5,
      usage_count: 1000,
    });
    
    const scoreNoUsage = computeQualityScore(recipeNoUsage);
    const scoreHighUsage = computeQualityScore(recipeHighUsage);
    
    expect(scoreHighUsage).toBeGreaterThan(scoreNoUsage);
  });

  it('should use default 0.55 for null quality score', () => {
    const recipe = mockRecipe({
      quality_score: null,
      thumbs_up: 0,
      thumbs_down: 0,
      usage_count: 0,
    });
    
    const score = computeQualityScore(recipe);
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThanOrEqual(0.6);
  });

  it('should clamp score between 0 and 1', () => {
    const veryBadRecipe = mockRecipe({
      quality_score: 0,
      thumbs_up: 0,
      thumbs_down: 100,
      usage_count: 0,
    });
    
    const veryGoodRecipe = mockRecipe({
      quality_score: 1,
      thumbs_up: 100,
      thumbs_down: 0,
      usage_count: 10000,
    });
    
    expect(computeQualityScore(veryBadRecipe)).toBeGreaterThanOrEqual(0);
    expect(computeQualityScore(veryGoodRecipe)).toBeLessThanOrEqual(1);
  });
});

describe('computePreferenceScore', () => {
  it('should return 0.5 for no preferences', () => {
    const recipe = mockRecipe();
    const user: UserLike = {};
    const prefs: RecipePrefsLike = {};
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(0.5);
  });

  it('should score 1.0 for matching meal type', () => {
    const recipe = mockRecipe({ meal_type: 'dinner' });
    const user: UserLike = {};
    const prefs: RecipePrefsLike = { mealType: 'dinner' };
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(1);
  });

  it('should score 0.0 for non-matching meal type', () => {
    const recipe = mockRecipe({ meal_type: 'dinner' });
    const user: UserLike = {};
    const prefs: RecipePrefsLike = { mealType: 'breakfast' };
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(0);
  });

  it('should handle "any" meal type', () => {
    const recipe = mockRecipe({ meal_type: 'dinner' });
    const user: UserLike = {};
    const prefs: RecipePrefsLike = { mealType: 'any' };
    
    const score = computePreferenceScore(recipe, user, prefs);
    // "any" should not count as a preference
    expect(score).toBe(0.5);
  });

  it('should boost score when must-include ingredient is present', () => {
    const recipe = mockRecipe({ ingredient_names: ['chicken', 'garlic'] });
    const user: UserLike = {};
    const prefs: RecipePrefsLike = { mustIncludeIngredient: 'chicken' };
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(1);
  });

  it('should reduce score when must-include ingredient is missing', () => {
    const recipe = mockRecipe({ ingredient_names: ['beef', 'garlic'] });
    const user: UserLike = {};
    const prefs: RecipePrefsLike = { mustIncludeIngredient: 'chicken' };
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(0);
  });

  it('should score for matching cuisine preferences', () => {
    const recipe = mockRecipe({ cuisine: 'italian' });
    const user: UserLike = { cuisinePreferences: ['italian', 'mexican'] };
    const prefs: RecipePrefsLike = {};
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(1);
  });

  it('should give partial score for non-matching cuisine', () => {
    const recipe = mockRecipe({ cuisine: 'chinese' });
    const user: UserLike = { cuisinePreferences: ['italian', 'mexican'] };
    const prefs: RecipePrefsLike = {};
    
    const score = computePreferenceScore(recipe, user, prefs);
    expect(score).toBe(0.4);
  });
});

describe('DEFAULT_WEIGHTS', () => {
  it('should sum to 1.0', () => {
    const sum =
      DEFAULT_WEIGHTS.inventoryCoverage +
      DEFAULT_WEIGHTS.explicitPreference +
      DEFAULT_WEIGHTS.quality +
      DEFAULT_WEIGHTS.tasteSimilarity +
      DEFAULT_WEIGHTS.novelty;
    
    expect(sum).toBe(1);
  });

  it('should have inventoryCoverage as highest weight', () => {
    expect(DEFAULT_WEIGHTS.inventoryCoverage).toBeGreaterThan(DEFAULT_WEIGHTS.explicitPreference);
    expect(DEFAULT_WEIGHTS.inventoryCoverage).toBeGreaterThan(DEFAULT_WEIGHTS.quality);
    expect(DEFAULT_WEIGHTS.inventoryCoverage).toBeGreaterThan(DEFAULT_WEIGHTS.tasteSimilarity);
    expect(DEFAULT_WEIGHTS.inventoryCoverage).toBeGreaterThan(DEFAULT_WEIGHTS.novelty);
  });
});
