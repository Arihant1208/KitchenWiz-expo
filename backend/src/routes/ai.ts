import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db';
import {
  fetchLibraryCandidates,
  incrementUsage,
  insertIntoLibrary,
  inventorySummaryText,
  isNearDuplicateByIngredients,
} from '../recipes/library';
import { rankCandidates, shouldReuse } from '../recipes/scoring';

const router = Router();

const DAILY_AI_REQUEST_LIMIT = 20;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function randomId() {
  return Math.random().toString(36).substring(7);
}

function cleanJson(text: string) {
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

function getLocalDayKey(req: any): string {
  const timeZoneHeader = (req.header('x-client-timezone') || '').toString().trim();
  if (timeZoneHeader) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZoneHeader,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());

      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Invalid timezone; fall through.
    }
  }

  const offsetHeader = (req.header('x-client-tz-offset-minutes') || '').toString().trim();
  const offsetMinutes = Number.parseInt(offsetHeader, 10);
  if (Number.isFinite(offsetMinutes)) {
    const localNow = new Date(Date.now() - offsetMinutes * 60_000);
    return localNow.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10); // UTC fallback
}

async function incrementDailyUsage(userId: string, dayKey: string): Promise<number> {
  const result = await query(
    `WITH upsert AS (
      INSERT INTO ai_usage_daily (user_id, day, requests_count)
      VALUES ($1, $2::date, 1)
      ON CONFLICT (user_id, day)
      DO UPDATE SET requests_count = ai_usage_daily.requests_count + 1, updated_at = NOW()
      RETURNING requests_count
    )
    SELECT requests_count FROM upsert`,
    [userId, dayKey]
  );

  return Number(result.rows?.[0]?.requests_count ?? 0);
}

let cachedModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
let cachedApiKey: string | null = null;
let cachedModelName: string | null = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY env var');
  }

  if (!cachedModel || cachedApiKey !== apiKey || cachedModelName !== DEFAULT_MODEL) {
    const genAI = new GoogleGenerativeAI(apiKey);
    cachedModel = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
    cachedApiKey = apiKey;
    cachedModelName = DEFAULT_MODEL;
  }

  return cachedModel;
}

function mapLibraryRowToRecipe(row: any, fallbackServings: number) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    ingredients: row.ingredients,
    instructions: row.instructions,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    calories: row.calories,
    matchScore: 0,
    tags: [
      ...(Array.isArray(row.diet_tags) ? row.diet_tags : []),
      ...(row.meal_type ? [row.meal_type] : []),
      ...(row.cuisine ? [row.cuisine] : []),
      `serves ${row.servings || fallbackServings}`,
    ].filter(Boolean),
  };
}

async function getRecipeForSlot(params: {
  req: any;
  inventory: any[];
  user: any;
  mealType: string;
  maxTimeMinutes: number;
  servings: number;
}): Promise<any> {
  const { req, inventory, user, mealType, maxTimeMinutes, servings } = params;

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

  if (shouldReuse(ranked[0])) {
    const top = ranked[0];
    incrementUsage(top.recipe.id).catch(() => undefined);
    const mapped = mapLibraryRowToRecipe(top.recipe, servings);
    mapped.matchScore = Math.round(top.inventoryCoverage * 100);
    return mapped;
  }

  const inventoryList = inventorySummaryText(inventory);
  const prompt = `
I have these ingredients: ${inventoryList}.
My profile: ${JSON.stringify(user)}.

Create ONE recipe suitable for ${mealType}.
- Servings: ${servings}
- Max total time (prep + cook): ${maxTimeMinutes} minutes

Take into account my cuisine preferences (${user.cuisinePreferences?.join(', ') || 'Any'}), dietary restrictions (${user.dietaryRestrictions?.join(', ') || 'None'}), and allergies (${user.allergies?.join(', ') || 'None'}).
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

  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(cleanJson(text));

  const recipe = typeof parsed === 'object' && parsed ? parsed : null;
  if (!recipe) {
    throw new Error('Invalid recipe generated');
  }

  // Best-effort store with dedupe (still return even if insert fails)
  const ingredientNames = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((x: any) => x?.name).filter((n: any) => typeof n === 'string')
    : [];

  const isDup = await isNearDuplicateByIngredients({ ingredientNames, threshold: 0.85, limit: 30 });
  if (!isDup) {
    const inserted = await insertIntoLibrary({
      title: String(recipe.title || '').trim() || 'Untitled recipe',
      description: typeof recipe.description === 'string' ? recipe.description : null,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      prepTime: Number.isFinite(recipe.prepTime) ? Number(recipe.prepTime) : null,
      cookTime: Number.isFinite(recipe.cookTime) ? Number(recipe.cookTime) : null,
      calories: Number.isFinite(recipe.calories) ? Number(recipe.calories) : null,
      servings,
      mealType: mealType || null,
      dietTags: Array.isArray(user?.dietaryRestrictions) ? user.dietaryRestrictions : [],
      allergens: Array.isArray(user?.allergies) ? user.allergies : [],
      source: 'generated',
      createdByUserId: req.user?.id || null,
    });

    if (inserted?.id) {
      recipe.id = inserted.id;
    }
  }

  return {
    ...recipe,
    id: recipe.id || randomId(),
  };
}

router.use(async (req: any, res: Response, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const dayKey = getLocalDayKey(req);
    const count = await incrementDailyUsage(userId, dayKey);

    if (count > DAILY_AI_REQUEST_LIMIT) {
      return res.status(429).json({
        message: 'Daily AI request quota exceeded',
        code: 'DAILY_QUOTA_EXCEEDED',
        limit: DAILY_AI_REQUEST_LIMIT,
        day: dayKey,
      });
    }

    req.aiQuota = { used: count, limit: DAILY_AI_REQUEST_LIMIT, day: dayKey };
    return next();
  } catch (err) {
    console.error('AI quota check failed:', err);
    return res.status(500).json({ message: 'AI quota check failed' });
  }
});

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

    const model = getModel();
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: typeof mimeType === 'string' && mimeType.trim() ? mimeType : 'image/jpeg',
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text();
    const data = JSON.parse(cleanJson(text));

    const items = Array.isArray(data)
      ? data.map((item: any) => ({
          ...item,
          id: randomId(),
        }))
      : [];

    return res.json(items);
  } catch (err) {
    console.error('AI receipt parse error:', err);
    return res.status(500).json({ message: 'Failed to read receipt.' });
  }
});

router.post('/recipes-from-inventory', async (req: any, res: Response) => {
  try {
    const { inventory, user, prefs } = req.body || {};

    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'inventory is required' });
    }
    if (!user || typeof user !== 'object') {
      return res.status(400).json({ message: 'user is required' });
    }

    const inventoryList = inventorySummaryText(inventory);

    const servings = Math.max(1, Math.round(prefs?.servings ?? user.householdSize ?? 1));
    const maxTimeMinutes = Math.max(10, Math.round(prefs?.maxTimeMinutes ?? user.maxCookingTime ?? 60));
    const mealType = (prefs?.mealType || 'any').toString().trim() || 'any';
    const cravings = (prefs?.cravings || '').toString().trim();
    const mustIncludeIngredient = (prefs?.mustIncludeIngredient || '').toString().trim();

    // 1) Retrieve + rank from recipe library
    const candidates = await fetchLibraryCandidates({
      mealType,
      maxTotalTimeMinutes: maxTimeMinutes,
      mustIncludeIngredient,
      limit: 30,
    });

    const ranked = rankCandidates(candidates, inventory, user, {
      servings,
      maxTimeMinutes,
      mealType,
      cravings,
      mustIncludeIngredient,
    });

    if (shouldReuse(ranked[0])) {
      const top3 = ranked.slice(0, 3).map((c) => c.recipe);

      // Track usage (best-effort; don't fail the request on analytics)
      for (const r of top3) {
        incrementUsage(r.id).catch(() => undefined);
      }

      const mapped = top3.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        ingredients: row.ingredients,
        instructions: row.instructions,
        prepTime: row.prep_time,
        cookTime: row.cook_time,
        calories: row.calories,
        matchScore: Math.round((ranked.find((x) => x.recipe.id === row.id)?.inventoryCoverage ?? 0) * 100),
        tags: [
          ...(Array.isArray(row.diet_tags) ? row.diet_tags : []),
          ...(row.meal_type ? [row.meal_type] : []),
          ...(row.cuisine ? [row.cuisine] : []),
          `serves ${row.servings || servings}`,
        ].filter(Boolean),
      }));

      return res.json(mapped);
    }

    // 2) Generate (fallback)
    const prompt = `
I have these ingredients: ${inventoryList}.
My profile: ${JSON.stringify(user)}.

Recipe preferences:
- Servings (number of people): ${servings}
- Max total time (prep + cook): ${maxTimeMinutes} minutes
- Meal type: ${mealType}
- Cravings / mood: ${cravings || 'None specified'}
- Must include this ingredient if possible: ${mustIncludeIngredient || 'None'}

Suggest 3 creative recipes that prioritize using my existing stock to reduce waste.
Take into account my cuisine preferences (${user.cuisinePreferences?.join(', ') || 'Any'}), dietary restrictions (${user.dietaryRestrictions?.join(', ') || 'None'}), and allergies (${user.allergies?.join(', ') || 'None'}).
Keep each recipe within the max total time (${maxTimeMinutes} minutes).
If a meal type is provided (not "any"), make recipes appropriate for that meal type.
If a must-include ingredient is provided, include it in each recipe when reasonable.
Rate each recipe with a 'matchScore' (0-100) based on how many ingredients I already have vs need to buy.

In the 'tags' array, include helpful short tags such as: cuisine, meal type, "serves ${servings}", cravings keywords (if any), and dietary-friendly tags when appropriate.

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

    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = JSON.parse(cleanJson(text));
    const generated = Array.isArray(parsed) ? parsed : [];

    // 3) Pick best + dedupe before saving (best-effort)
    // We treat "best" as max matchScore; fallback to first.
    const best = generated
      .slice()
      .sort((a: any, b: any) => Number(b?.matchScore ?? 0) - Number(a?.matchScore ?? 0))[0];

    if (best && typeof best === 'object') {
      const ingredientNames = Array.isArray(best.ingredients)
        ? best.ingredients.map((x: any) => x?.name).filter((n: any) => typeof n === 'string')
        : [];

      const isDup = await isNearDuplicateByIngredients({ ingredientNames, threshold: 0.85, limit: 30 });

      if (!isDup) {
        const inserted = await insertIntoLibrary({
          title: String(best.title || '').trim() || 'Untitled recipe',
          description: typeof best.description === 'string' ? best.description : null,
          ingredients: Array.isArray(best.ingredients) ? best.ingredients : [],
          instructions: Array.isArray(best.instructions) ? best.instructions : [],
          prepTime: Number.isFinite(best.prepTime) ? Number(best.prepTime) : null,
          cookTime: Number.isFinite(best.cookTime) ? Number(best.cookTime) : null,
          calories: Number.isFinite(best.calories) ? Number(best.calories) : null,
          servings,
          mealType: mealType !== 'any' ? mealType : null,
          dietTags: Array.isArray(user?.dietaryRestrictions) ? user.dietaryRestrictions : [],
          allergens: Array.isArray(user?.allergies) ? user.allergies : [],
          source: 'generated',
          createdByUserId: req.user?.id || null,
        });

        if (inserted?.id) {
          // Replace the best candidate's id with the stable library id.
          best.id = inserted.id;
        }
      }
    }

    // Always return 3 recipes to match the existing client expectation.
    const recipes = generated.slice(0, 3).map((r: any) => ({
      ...r,
      id: r?.id || randomId(),
    }));

    return res.json(recipes);
  } catch (err) {
    console.error('AI recipe gen error:', err);
    return res.status(500).json({ message: 'Failed to generate recipes.' });
  }
});

router.post('/weekly-meal-plan', async (req: any, res: Response) => {
  try {
    const { user, inventory } = req.body || {};

    if (!user || typeof user !== 'object') {
      return res.status(400).json({ message: 'user is required' });
    }
    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'inventory is required' });
    }

    const maxTimeMinutes = Math.max(10, Math.round(user.maxCookingTime || 60));
    const servings = Math.max(1, Math.round(user.householdSize || 1));

    const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days: any[] = [];

    // Per-slot gate: reuse library recipes when good enough; generate only when needed.
    for (const dayName of week) {
      const breakfast = await getRecipeForSlot({
        req,
        inventory,
        user,
        mealType: 'breakfast',
        maxTimeMinutes,
        servings,
      });

      const lunch = await getRecipeForSlot({
        req,
        inventory,
        user,
        mealType: 'lunch',
        maxTimeMinutes,
        servings,
      });

      const dinner = await getRecipeForSlot({
        req,
        inventory,
        user,
        mealType: 'dinner',
        maxTimeMinutes,
        servings,
      });

      days.push({
        day: dayName,
        breakfast: breakfast ? { ...breakfast, id: breakfast.id || randomId() } : undefined,
        lunch: lunch ? { ...lunch, id: lunch.id || randomId() } : undefined,
        dinner: dinner ? { ...dinner, id: dinner.id || randomId() } : undefined,
      });
    }

    return res.json(days);
  } catch (err) {
    console.error('AI meal plan error:', err);
    return res.status(500).json({ message: 'Failed to generate meal plan.' });
  }
});

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

    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = JSON.parse(cleanJson(text));
    const items = Array.isArray(parsed)
      ? parsed.map((item: any) => ({
          ...item,
          id: randomId(),
          checked: false,
        }))
      : [];

    return res.json(items);
  } catch (err) {
    console.error('AI shopping list error:', err);
    return res.status(500).json({ message: 'Failed to generate shopping list.' });
  }
});

router.post('/chat', async (req: any, res: Response) => {
  try {
    const { history, message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'message is required' });
    }

    const safeHistory = Array.isArray(history) ? history : [];

    const model = getModel();
    const chat = model.startChat({ history: safeHistory });
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return res.json({ response });
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({ message: "Sorry, I couldn't process your message. Please try again." });
  }
});

export default router;
