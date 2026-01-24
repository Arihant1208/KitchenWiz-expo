/*
  Smoke test: verify /api/ai/weekly-meal-plan reuses recipe_library per slot.

  Requirements:
  - backend server running locally
  - DATABASE_URL or DB_* in backend/.env

  This test does NOT require GEMINI_API_KEY because it seeds recipe_library
  with strong matches (coverage + cuisine + meal_type) so the reuse gate should trigger.
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000/api';

function randomEmail() {
  const suffix = Math.random().toString(36).slice(2);
  return `smoke.week.${suffix}@example.com`;
}

async function httpJson(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const msg = typeof payload?.message === 'string' ? payload.message : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

async function dbClient() {
  const connectionString = process.env.DATABASE_URL;
  const hasUrl = typeof connectionString === 'string' && connectionString.length > 0;

  return new Client(
    hasUrl
      ? {
          connectionString,
          ssl: /sslmode=require/i.test(connectionString) || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        }
      : {
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        }
  );
}

async function seedMealType(title, mealType, ingredients) {
  const client = await dbClient();
  await client.connect();
  try {
    await client.query('DELETE FROM recipe_library WHERE title = $1', [title]);

    const ingredientNames = ingredients.map((x) => x.name);

    const inserted = await client.query(
      `INSERT INTO recipe_library (
        title, description, ingredients, instructions,
        ingredient_names, ingredient_signature,
        prep_time, cook_time, servings, calories,
        source, diet_tags, allergens,
        cuisine, meal_type
      )
      VALUES (
        $1, $2, $3::jsonb, $4::jsonb,
        $5::text[], $6,
        $7, $8, $9, $10,
        'curated', $11::text[], $12::text[],
        $13, $14
      )
      RETURNING id`,
      [
        title,
        `Seeded ${mealType} recipe for weekly plan reuse smoke test.`,
        JSON.stringify(ingredients),
        JSON.stringify(['Do the thing', 'Serve']),
        ingredientNames,
        ingredientNames.map((n) => n.toLowerCase()).sort().join('|'),
        5,
        10,
        2,
        250,
        [],
        [],
        'italian',
        mealType,
      ]
    );

    const id = inserted.rows?.[0]?.id;
    if (!id) throw new Error(`Failed to seed ${mealType}`);
    return id;
  } finally {
    await client.end();
  }
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('This script requires Node.js 18+ (global fetch).');
  }

  console.log('Seeding recipe_library for breakfast/lunch/dinner...');
  const breakfastId = await seedMealType(
    'Smoke Weekly Breakfast Reuse',
    'breakfast',
    [
      { name: 'Eggs', amount: '2' },
      { name: 'Milk', amount: '1/4 cup' },
      { name: 'Spinach', amount: '1 cup' },
    ]
  );

  const lunchId = await seedMealType(
    'Smoke Weekly Lunch Reuse',
    'lunch',
    [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Rice', amount: '1 cup' },
      { name: 'Tomatoes', amount: '1' },
    ]
  );

  const dinnerId = await seedMealType(
    'Smoke Weekly Dinner Reuse',
    'dinner',
    [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Spinach', amount: '1 cup' },
      { name: 'Rice', amount: '1 cup' },
    ]
  );

  console.log('Seeded IDs:', { breakfastId, lunchId, dinnerId });

  console.log('Signing up temp user...');
  const email = randomEmail();
  const password = 'smoke-test-password';

  const signup = await httpJson(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'SmokeWeek' }),
  });

  const accessToken = signup?.accessToken;
  if (!accessToken) throw new Error('No accessToken returned from signup');

  console.log('Fetching user profile...');
  const profile = await httpJson(`${BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const inventory = [
    { id: 'i1', name: 'Eggs', quantity: '2', category: 'dairy' },
    { id: 'i2', name: 'Milk', quantity: '1L', category: 'dairy' },
    { id: 'i3', name: 'Spinach', quantity: '200g', category: 'produce' },
    { id: 'i4', name: 'Chicken Breast', quantity: '500g', category: 'meat' },
    { id: 'i5', name: 'Rice', quantity: '1kg', category: 'pantry' },
    { id: 'i6', name: 'Tomatoes', quantity: '2', category: 'produce' },
  ];

  console.log('Calling /ai/weekly-meal-plan...');
  const plan = await httpJson(`${BASE_URL}/ai/weekly-meal-plan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ user: profile, inventory }),
  });

  if (!Array.isArray(plan) || plan.length !== 7) {
    throw new Error(`Expected 7-day plan array, got ${Array.isArray(plan) ? plan.length : typeof plan}`);
  }

  const monday = plan[0];
  if (!monday || monday.day !== 'Monday') {
    throw new Error('Expected Monday as first entry');
  }

  console.log('Monday IDs:', {
    breakfast: monday.breakfast?.id,
    lunch: monday.lunch?.id,
    dinner: monday.dinner?.id,
  });

  if (monday.breakfast?.id !== breakfastId) {
    throw new Error(`Expected Monday breakfast reuse ${breakfastId} but got ${monday.breakfast?.id}`);
  }
  if (monday.lunch?.id !== lunchId) {
    throw new Error(`Expected Monday lunch reuse ${lunchId} but got ${monday.lunch?.id}`);
  }
  if (monday.dinner?.id !== dinnerId) {
    throw new Error(`Expected Monday dinner reuse ${dinnerId} but got ${monday.dinner?.id}`);
  }

  console.log('✅ Smoke test passed: weekly meal plan reused recipe_library per slot.');
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err?.message || err);
  if (err?.payload) {
    console.error('Payload:', typeof err.payload === 'string' ? err.payload : JSON.stringify(err.payload, null, 2));
  }
  process.exit(1);
});
