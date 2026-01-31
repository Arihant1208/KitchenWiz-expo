/**
 * AI Routes
 *
 * Endpoints for AI-powered features: recipe generation, receipt parsing,
 * meal planning, shopping lists, and chat.
 */

import { Router, Response } from 'express';
import { DAILY_AI_REQUEST_LIMIT } from '../constants';
import { randomId } from '../helpers';
import {
  generateJson,
  chat as aiChat,
  checkAndIncrementQuota,
  generateRecipesFromInventory,
  generateWeeklyMealPlan,
} from '../services';
import { inventorySummaryText } from '../recipes/library';
import { safePositiveInt } from '../helpers/validation';

const router = Router();

// ---------------------------------------------------------------------------
// Quota Middleware
// ---------------------------------------------------------------------------

router.use(async (req: any, res: Response, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const quota = await checkAndIncrementQuota(userId, req);

    if (quota.exceeded) {
      return res.status(429).json({
        message: 'Daily AI request quota exceeded',
        code: 'DAILY_QUOTA_EXCEEDED',
        limit: quota.limit,
        day: quota.day,
      });
    }

    req.aiQuota = quota;
    return next();
  } catch (err) {
    req.log.error({ err, action: 'ai_quota_check' }, 'AI quota check failed');
    return res.status(500).json({ message: 'AI quota check failed' });
  }
});

// ---------------------------------------------------------------------------
// Receipt Parsing
// ---------------------------------------------------------------------------

router.post('/receipt-parse', async (req: any, res: Response) => {
  try {
    const { base64Data, mimeType } = req.body || {};

    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ message: 'base64Data is required' });
    }

    const prompt = `Analyze this grocery receipt. Extract the items as ingredients.
For each item, determine a likely category (produce, dairy, meat, pantry, frozen, other),
a standard quantity (e.g., "1 unit", "500g"), and estimate an expiry date from today (YYYY-MM-DD) based on the type of food.
Return ONLY a valid JSON array with objects containing: name, quantity, category, expiryDate, caloriesPerUnit (optional number).
Categories must be one of: produce, dairy, meat, pantry, frozen, other.`;

    const data = await generateJson<any[]>({
      prompt,
      image: {
        mimeType: typeof mimeType === 'string' && mimeType.trim() ? mimeType : 'image/jpeg',
        data: base64Data,
      },
    });

    const items = Array.isArray(data)
      ? data.map((item) => ({ ...item, id: randomId() }))
      : [];

    return res.json(items);
  } catch (err) {
    req.log.error({ err, action: 'receipt_parse' }, 'AI receipt parse failed');
    return res.status(500).json({ message: 'Failed to read receipt.' });
  }
});

// ---------------------------------------------------------------------------
// Recipe Generation
// ---------------------------------------------------------------------------

router.post('/recipes-from-inventory', async (req: any, res: Response) => {
  try {
    const { inventory, user, prefs } = req.body || {};

    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'inventory is required' });
    }
    if (!user || typeof user !== 'object') {
      return res.status(400).json({ message: 'user is required' });
    }

    const normalizedPrefs = {
      servings: safePositiveInt(prefs?.servings ?? user.householdSize, 1),
      maxTimeMinutes: safePositiveInt(prefs?.maxTimeMinutes ?? user.maxCookingTime, 60),
      mealType: (prefs?.mealType || 'any').toString().trim() || 'any',
      cravings: (prefs?.cravings || '').toString().trim(),
      mustIncludeIngredient: (prefs?.mustIncludeIngredient || '').toString().trim(),
    };

    const result = await generateRecipesFromInventory(
      inventory,
      user,
      normalizedPrefs,
      req.log,
      req.user?.id
    );

    return res.json(result.recipes);
  } catch (err) {
    req.log.error({ err, action: 'recipes_from_inventory' }, 'AI recipe generation failed');
    return res.status(500).json({ message: 'Failed to generate recipes.' });
  }
});

// ---------------------------------------------------------------------------
// Weekly Meal Plan
// ---------------------------------------------------------------------------

router.post('/weekly-meal-plan', async (req: any, res: Response) => {
  try {
    const { user, inventory } = req.body || {};

    if (!user || typeof user !== 'object') {
      return res.status(400).json({ message: 'user is required' });
    }
    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'inventory is required' });
    }

    const days = await generateWeeklyMealPlan(inventory, user, req.log, req.user?.id);

    return res.json(days);
  } catch (err) {
    req.log.error({ err, action: 'weekly_meal_plan' }, 'AI meal plan failed');
    return res.status(500).json({ message: 'Failed to generate meal plan.' });
  }
});

// ---------------------------------------------------------------------------
// Shopping List
// ---------------------------------------------------------------------------

router.post('/shopping-list', async (req: any, res: Response) => {
  try {
    const { inventory, mealPlan } = req.body || {};

    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'inventory is required' });
    }
    if (!Array.isArray(mealPlan)) {
      return res.status(400).json({ message: 'mealPlan is required' });
    }

    const inventoryList = inventory.map((i: any) => i.name).join(', ');
    const meals = mealPlan
      .flatMap((d: any) => [d.breakfast?.title, d.lunch?.title, d.dinner?.title])
      .filter(Boolean);

    const prompt = `
Based on these planned meals: ${meals.join(', ')}
And current inventory: ${inventoryList || 'Empty'}

Generate a shopping list of items I need to buy.

Return ONLY a valid JSON array with objects containing:
- name (string)
- quantity (string like "2 lbs", "1 dozen", etc.)
- category (one of: produce, dairy, meat, pantry, frozen, other)
`;

    const parsed = await generateJson<any[]>({ prompt });

    const items = Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          id: randomId(),
          checked: false,
        }))
      : [];

    return res.json(items);
  } catch (err) {
    req.log.error({ err, action: 'shopping_list' }, 'AI shopping list failed');
    return res.status(500).json({ message: 'Failed to generate shopping list.' });
  }
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

router.post('/chat', async (req: any, res: Response) => {
  try {
    const { history, message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'message is required' });
    }

    const safeHistory = Array.isArray(history) ? history : [];
    const response = await aiChat(message, safeHistory);

    return res.json({ response });
  } catch (err) {
    req.log.error({ err, action: 'chat' }, 'AI chat failed');
    return res.status(500).json({ message: "Sorry, I couldn't process your message. Please try again." });
  }
});

export default router;
