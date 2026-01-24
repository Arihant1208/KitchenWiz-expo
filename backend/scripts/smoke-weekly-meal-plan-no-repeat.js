/*
  Smoke test: verify /api/ai/weekly-meal-plan rotates reusable recipes
  so the same recipe ID is not repeated across days.

  Requirements:
  - backend server running locally
  - DATABASE_URL or DB_* in backend/.env

  This test seeds 2 recipes per meal type that should pass the reuse gate.
  It then asserts Monday and Tuesday meals use different IDs.
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3005/api';

function randomEmail() {
  const suffix = Math.random().toString(36).slice(2);
  return `smoke.norepeat.${suffix}@example.com`;
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

async function seed(title, mealType, ingredients) {
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
        `Seeded ${mealType} recipe for no-repeat smoke test.`,
        JSON.stringify(ingredients),
        JSON.stringify(['Step 1', 'Step 2']),
        ingredientNames,
        ingredientNames.map((n) => n.toLowerCase()).sort().join('|') + '|' + title.toLowerCase(),
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

async function resetLibrary() {
  const client = await dbClient();
  await client.connect();
  try {
    // Keep this smoke test deterministic by clearing the global library.
    // (Otherwise older seed data can outrank our test recipes.)
    await client.query('DELETE FROM recipe_library');
  } finally {
    await client.end();
  }
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('This script requires Node.js 18+ (global fetch).');
  }

  console.log('Resetting recipe_library for deterministic results...');
  await resetLibrary();

  console.log('Seeding 2 recipes per meal type...');

  const breakfastIds = [
    await seed('Smoke NR Breakfast A', 'breakfast', [
      { name: 'Eggs', amount: '2' },
      { name: 'Milk', amount: '1/4 cup' },
      { name: 'Spinach', amount: '1 cup' },
    ]),
    await seed('Smoke NR Breakfast B', 'breakfast', [
      { name: 'Eggs', amount: '2' },
      { name: 'Milk', amount: '1/4 cup' },
      { name: 'Tomatoes', amount: '1' },
    ]),
  ];

  const lunchIds = [
    await seed('Smoke NR Lunch A', 'lunch', [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Rice', amount: '1 cup' },
      { name: 'Tomatoes', amount: '1' },
    ]),
    await seed('Smoke NR Lunch B', 'lunch', [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Rice', amount: '1 cup' },
      { name: 'Spinach', amount: '1 cup' },
    ]),
  ];

  const dinnerIds = [
    await seed('Smoke NR Dinner A', 'dinner', [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Spinach', amount: '1 cup' },
      { name: 'Rice', amount: '1 cup' },
    ]),
    await seed('Smoke NR Dinner B', 'dinner', [
      { name: 'Chicken Breast', amount: '200g' },
      { name: 'Tomatoes', amount: '1' },
      { name: 'Rice', amount: '1 cup' },
    ]),
  ];

  console.log('Seeded IDs:', { breakfastIds, lunchIds, dinnerIds });

  console.log('Signing up temp user...');
  const email = randomEmail();
  const password = 'smoke-test-password';

  const signup = await httpJson(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'SmokeNoRepeat' }),
  });

  const accessToken = signup?.accessToken;
  if (!accessToken) throw new Error('No accessToken returned from signup');

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

  if (!Array.isArray(plan) || plan.length < 2) {
    throw new Error('Expected weekly plan array with at least 2 days');
  }

  const monday = plan[0];
  const tuesday = plan[1];

  console.log('Monday IDs:', {
    breakfast: monday.breakfast?.id,
    lunch: monday.lunch?.id,
    dinner: monday.dinner?.id,
  });
  console.log('Tuesday IDs:', {
    breakfast: tuesday.breakfast?.id,
    lunch: tuesday.lunch?.id,
    dinner: tuesday.dinner?.id,
  });

  // Ensure both days used seeded IDs
  if (!breakfastIds.includes(monday.breakfast?.id) || !breakfastIds.includes(tuesday.breakfast?.id)) {
    throw new Error('Expected Monday/Tuesday breakfast to come from seeded set');
  }
  if (!lunchIds.includes(monday.lunch?.id) || !lunchIds.includes(tuesday.lunch?.id)) {
    throw new Error('Expected Monday/Tuesday lunch to come from seeded set');
  }
  if (!dinnerIds.includes(monday.dinner?.id) || !dinnerIds.includes(tuesday.dinner?.id)) {
    throw new Error('Expected Monday/Tuesday dinner to come from seeded set');
  }

  // And ensure no repeats across days
  if (monday.breakfast?.id === tuesday.breakfast?.id) {
    throw new Error('Breakfast repeated across days');
  }
  if (monday.lunch?.id === tuesday.lunch?.id) {
    throw new Error('Lunch repeated across days');
  }
  if (monday.dinner?.id === tuesday.dinner?.id) {
    throw new Error('Dinner repeated across days');
  }

  console.log('✅ Smoke test passed: weekly plan rotates recipes (no repeats across days).');
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err?.message || err);
  if (err?.payload) {
    console.error('Payload:', typeof err.payload === 'string' ? err.payload : JSON.stringify(err.payload, null, 2));
  }
  process.exit(1);
});
