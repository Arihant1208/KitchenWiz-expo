import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get Meal Plan
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY id', 
      [userId]
    );
    
    const mealPlan = result.rows.map(row => ({
      day: row.day,
      breakfast: row.breakfast ? (typeof row.breakfast === 'string' ? JSON.parse(row.breakfast) : row.breakfast) : undefined,
      lunch: row.lunch ? (typeof row.lunch === 'string' ? JSON.parse(row.lunch) : row.lunch) : undefined,
      dinner: row.dinner ? (typeof row.dinner === 'string' ? JSON.parse(row.dinner) : row.dinner) : undefined,
    }));
    
    res.json({ mealPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Sync Meal Plan
router.post('/sync', async (req: Request, res: Response) => {
  const plan = req.body?.mealPlan; // Array of MealPlanDay
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(plan)) {
      return res.status(400).json({ error: 'mealPlan must be an array' });
    }

    await query('DELETE FROM meal_plans WHERE user_id = $1', [userId]);
    
    for (const day of plan) {
      await query(
        `INSERT INTO meal_plans (user_id, day, breakfast, lunch, dinner)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          day.day, 
          day.breakfast ? JSON.stringify(day.breakfast) : null, 
          day.lunch ? JSON.stringify(day.lunch) : null, 
          day.dinner ? JSON.stringify(day.dinner) : null
        ]
      );
    }
    
    res.json({ success: true, days: plan.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync meal plan' });
  }
});

// Update single day
router.put('/:day', async (req: Request, res: Response) => {
  const { day } = req.params;
  const { breakfast, lunch, dinner } = req.body;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `UPDATE meal_plans 
       SET breakfast = $2, lunch = $3, dinner = $4, updated_at = NOW()
       WHERE user_id = $1 AND day = $5
       RETURNING *`,
      [
        userId,
        breakfast ? JSON.stringify(breakfast) : null,
        lunch ? JSON.stringify(lunch) : null,
        dinner ? JSON.stringify(dinner) : null,
        day
      ]
    );
    
    if (result.rows.length === 0) {
      // Insert if not exists
      await query(
        `INSERT INTO meal_plans (user_id, day, breakfast, lunch, dinner)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          day,
          breakfast ? JSON.stringify(breakfast) : null,
          lunch ? JSON.stringify(lunch) : null,
          dinner ? JSON.stringify(dinner) : null
        ]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// Clear meal plan
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await query('DELETE FROM meal_plans WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear meal plan' });
  }
});

export default router;
