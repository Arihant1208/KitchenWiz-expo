import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get All Discovered Recipes
router.get('/discovered', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'SELECT * FROM recipes WHERE user_id = $1 AND is_saved = FALSE ORDER BY created_at DESC', 
      [userId]
    );
    res.json({ recipes: result.rows.map(mapRecipe) });
  } catch (err) {
    req.log.error({ err }, 'Get discovered recipes failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Saved Recipes
router.get('/saved', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'SELECT * FROM recipes WHERE user_id = $1 AND is_saved = TRUE ORDER BY created_at DESC', 
      [userId]
    );
    res.json({ recipes: result.rows.map(mapRecipe) });
  } catch (err) {
    req.log.error({ err }, 'Get saved recipes failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Sync discovered recipes
router.post('/discovered', async (req: any, res: Response) => {
  const recipes = req.body?.recipes;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(recipes)) {
      return res.status(400).json({ error: 'recipes must be an array' });
    }

    await query('DELETE FROM recipes WHERE user_id = $1 AND is_saved = FALSE', [userId]);
    
    for (const r of recipes) {
      await insertRecipe(userId, r, false);
    }
    
    res.json({ success: true, count: recipes.length });
  } catch (err) {
    req.log.error({ err }, 'Sync discovered recipes failed');
    res.status(500).json({ error: 'Failed to sync discovered recipes' });
  }
});

// Sync saved recipes
router.post('/saved', async (req: any, res: Response) => {
  const recipes = req.body?.recipes;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(recipes)) {
      return res.status(400).json({ error: 'recipes must be an array' });
    }

    await query('DELETE FROM recipes WHERE user_id = $1 AND is_saved = TRUE', [userId]);
    
    for (const r of recipes) {
      await insertRecipe(userId, r, true);
    }
    
    res.json({ success: true, count: recipes.length });
  } catch (err) {
    req.log.error({ err }, 'Sync saved recipes failed');
    res.status(500).json({ error: 'Failed to sync saved recipes' });
  }
});

// Save a single recipe
router.post('/:id/save', async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'UPDATE recipes SET is_saved = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(mapRecipe(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, 'Save recipe failed');
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Unsave a recipe
router.post('/:id/unsave', async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'UPDATE recipes SET is_saved = FALSE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(mapRecipe(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, 'Unsave recipe failed');
    res.status(500).json({ error: 'Failed to unsave recipe' });
  }
});

async function insertRecipe(userId: string, r: any, isSaved: boolean) {
  await query(
    `INSERT INTO recipes (user_id, title, description, ingredients, instructions, prep_time, cook_time, calories, match_score, tags, is_saved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      userId,
      r.title, 
      r.description, 
      JSON.stringify(r.ingredients), 
      JSON.stringify(r.instructions), 
      r.prepTime, 
      r.cookTime, 
      r.calories, 
      r.matchScore, 
      r.tags, 
      isSaved
    ]
  );
}

function mapRecipe(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    ingredients: typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients,
    instructions: typeof row.instructions === 'string' ? JSON.parse(row.instructions) : row.instructions,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    calories: row.calories,
    matchScore: row.match_score,
    tags: row.tags,
    isSaved: row.is_saved
  };
}

export default router;
