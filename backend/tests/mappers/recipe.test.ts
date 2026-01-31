/**
 * Mapper Tests - Recipe
 */

import {
  mapLibraryRowToRecipe,
  mapRankedCandidateToRecipe,
  buildRecipeTags,
  mapGeneratedRecipe,
} from '../../src/mappers/recipe';
import type { LibraryRecipeRow, RankedCandidate } from '../../src/recipes/scoring';

// Mock recipe row factory
function mockRecipeRow(overrides: Partial<LibraryRecipeRow> = {}): LibraryRecipeRow {
  return {
    id: 'recipe-123',
    title: 'Chicken Pasta',
    description: 'Delicious chicken pasta',
    ingredients: [{ name: 'chicken', quantity: '500g' }, { name: 'pasta', quantity: '250g' }],
    instructions: ['Cook pasta', 'Add chicken', 'Serve'],
    ingredient_names: ['chicken', 'pasta'],
    ingredient_signature: 'chicken|pasta',
    cuisine: 'italian',
    meal_type: 'dinner',
    diet_tags: ['high-protein', 'gluten-free'],
    allergens: ['gluten'],
    prep_time: 15,
    cook_time: 30,
    servings: 4,
    calories: 450,
    quality_score: 0.8,
    usage_count: 100,
    save_count: 25,
    thumbs_up: 80,
    thumbs_down: 5,
    ...overrides,
  };
}

describe('mapLibraryRowToRecipe', () => {
  it('should map all fields correctly', () => {
    const row = mockRecipeRow();
    const result = mapLibraryRowToRecipe(row, 2, 85);

    expect(result.id).toBe('recipe-123');
    expect(result.title).toBe('Chicken Pasta');
    expect(result.description).toBe('Delicious chicken pasta');
    expect(result.ingredients).toEqual(row.ingredients);
    expect(result.instructions).toEqual(row.instructions);
    expect(result.prepTime).toBe(15);
    expect(result.cookTime).toBe(30);
    expect(result.calories).toBe(450);
    expect(result.matchScore).toBe(85);
  });

  it('should use fallback servings in tags when row has no servings', () => {
    const row = mockRecipeRow({ servings: null });
    const result = mapLibraryRowToRecipe(row, 2);

    expect(result.tags).toContain('serves 2');
  });

  it('should use row servings when available', () => {
    const row = mockRecipeRow({ servings: 6 });
    const result = mapLibraryRowToRecipe(row, 2);

    expect(result.tags).toContain('serves 6');
  });

  it('should default matchScore to 0', () => {
    const row = mockRecipeRow();
    const result = mapLibraryRowToRecipe(row, 2);

    expect(result.matchScore).toBe(0);
  });
});

describe('mapRankedCandidateToRecipe', () => {
  it('should map ranked candidate with correct match score', () => {
    const row = mockRecipeRow();
    const candidate: RankedCandidate = {
      recipe: row,
      inventoryCoverage: 0.85,
      missingCount: 2,
      preferenceScore: 0.7,
      qualityScore: 0.8,
      tasteSimilarity: 0.6,
      noveltyBonus: 0.5,
      compositeScore: 0.75,
      missingIngredients: ['salt', 'pepper'],
    };

    const result = mapRankedCandidateToRecipe(candidate, 4);

    // Match score should be inventoryCoverage * 100, rounded
    expect(result.matchScore).toBe(85);
    expect(result.id).toBe(row.id);
    expect(result.title).toBe(row.title);
  });

  it('should handle 0% inventory coverage', () => {
    const candidate: RankedCandidate = {
      recipe: mockRecipeRow(),
      inventoryCoverage: 0,
      missingCount: 5,
      preferenceScore: 0.5,
      qualityScore: 0.5,
      tasteSimilarity: 0.5,
      noveltyBonus: 0.5,
      compositeScore: 0.25,
      missingIngredients: ['a', 'b', 'c', 'd', 'e'],
    };

    const result = mapRankedCandidateToRecipe(candidate, 4);
    expect(result.matchScore).toBe(0);
  });

  it('should handle 100% inventory coverage', () => {
    const candidate: RankedCandidate = {
      recipe: mockRecipeRow(),
      inventoryCoverage: 1,
      missingCount: 0,
      preferenceScore: 1,
      qualityScore: 1,
      tasteSimilarity: 1,
      noveltyBonus: 0.5,
      compositeScore: 0.95,
      missingIngredients: [],
    };

    const result = mapRankedCandidateToRecipe(candidate, 4);
    expect(result.matchScore).toBe(100);
  });
});

describe('buildRecipeTags', () => {
  it('should include diet tags', () => {
    const row = mockRecipeRow({ diet_tags: ['vegan', 'gluten-free'] });
    const tags = buildRecipeTags(row, 4);

    expect(tags).toContain('vegan');
    expect(tags).toContain('gluten-free');
  });

  it('should include meal type', () => {
    const row = mockRecipeRow({ meal_type: 'breakfast' });
    const tags = buildRecipeTags(row, 4);

    expect(tags).toContain('breakfast');
  });

  it('should include cuisine', () => {
    const row = mockRecipeRow({ cuisine: 'mexican' });
    const tags = buildRecipeTags(row, 4);

    expect(tags).toContain('mexican');
  });

  it('should include servings', () => {
    const row = mockRecipeRow({ servings: 6 });
    const tags = buildRecipeTags(row, 4);

    expect(tags).toContain('serves 6');
  });

  it('should use fallback servings when null', () => {
    const row = mockRecipeRow({ servings: null });
    const tags = buildRecipeTags(row, 4);

    expect(tags).toContain('serves 4');
  });

  it('should handle missing optional fields', () => {
    const row = mockRecipeRow({
      diet_tags: [],
      meal_type: null,
      cuisine: null,
      servings: null,
    });
    const tags = buildRecipeTags(row, 2);

    expect(tags).toEqual(['serves 2']);
  });
});

describe('mapGeneratedRecipe', () => {
  it('should map all fields from generated recipe', () => {
    const generated = {
      title: 'Quick Salad',
      description: 'A fresh salad',
      ingredients: [{ name: 'lettuce' }, { name: 'tomato' }],
      instructions: ['Wash', 'Chop', 'Mix'],
      prepTime: 10,
      cookTime: 0,
      calories: 150,
      matchScore: 90,
      tags: ['salad', 'quick'],
    };

    const result = mapGeneratedRecipe(generated, 'gen-123');

    expect(result.id).toBe('gen-123');
    expect(result.title).toBe('Quick Salad');
    expect(result.description).toBe('A fresh salad');
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(3);
    expect(result.prepTime).toBe(10);
    expect(result.cookTime).toBe(0);
    expect(result.calories).toBe(150);
    expect(result.matchScore).toBe(90);
    expect(result.tags).toEqual(['salad', 'quick']);
  });

  it('should handle missing fields with defaults', () => {
    const generated = {};
    const result = mapGeneratedRecipe(generated, 'gen-456', ['default-tag']);

    expect(result.id).toBe('gen-456');
    expect(result.title).toBe('Untitled');
    expect(result.description).toBeNull();
    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
    expect(result.prepTime).toBeNull();
    expect(result.cookTime).toBeNull();
    expect(result.calories).toBeNull();
    expect(result.matchScore).toBe(0);
    expect(result.tags).toEqual(['default-tag']);
  });

  it('should handle non-finite numbers', () => {
    const generated = {
      prepTime: NaN,
      cookTime: Infinity,
      calories: -Infinity,
      matchScore: NaN,
    };

    const result = mapGeneratedRecipe(generated, 'gen-789');

    expect(result.prepTime).toBeNull();
    expect(result.cookTime).toBeNull();
    expect(result.calories).toBeNull();
    expect(result.matchScore).toBe(0);
  });

  it('should handle non-array ingredients/instructions', () => {
    const generated = {
      ingredients: 'not an array',
      instructions: { step: 'also not an array' },
      tags: 'not an array either',
    };

    const result = mapGeneratedRecipe(generated, 'gen-999', ['fallback']);

    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
    expect(result.tags).toEqual(['fallback']);
  });
});
