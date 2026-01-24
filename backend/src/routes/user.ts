import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get User Profile
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      // Create default user if not exists
      const defaultUser = await query(
        `INSERT INTO users (id, name, dietary_restrictions, allergies, cuisine_preferences, goals, cooking_skill, household_size, max_cooking_time)
         VALUES ($1, 'Chef', ARRAY[]::text[], ARRAY[]::text[], ARRAY['Italian']::text[], 'maintenance', 'intermediate', 2, 60)
         RETURNING *`,
        [userId]
      );
      return res.json(mapUserFromDb(defaultUser.rows[0]));
    }

    res.json(mapUserFromDb(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, 'Get user profile failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update User Profile
router.put('/', async (req: any, res: Response) => {
  const { 
    name, 
    dietaryRestrictions, 
    allergies, 
    goals, 
    cookingSkill, 
    householdSize, 
    cuisinePreferences, 
    maxCookingTime 
  } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `UPDATE users 
       SET name = $2, 
           dietary_restrictions = $3, 
           allergies = $4, 
           goals = $5, 
           cooking_skill = $6, 
           household_size = $7, 
           cuisine_preferences = $8, 
           max_cooking_time = $9, 
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        userId,
        name, 
        dietaryRestrictions, 
        allergies, 
        goals, 
        cookingSkill, 
        householdSize, 
        cuisinePreferences, 
        maxCookingTime
      ]
    );
    res.json(mapUserFromDb(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, 'Update user profile failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper to map snake_case DB columns to camelCase API response
function mapUserFromDb(row: any) {
  return {
    name: row.name,
    dietaryRestrictions: row.dietary_restrictions || [],
    allergies: row.allergies || [],
    goals: row.goals,
    cookingSkill: row.cooking_skill,
    householdSize: row.household_size,
    cuisinePreferences: row.cuisine_preferences || [],
    maxCookingTime: row.max_cooking_time
  };
}

export default router;
