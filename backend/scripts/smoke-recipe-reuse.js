/*
  Smoke test: verify /api/ai/recipes-from-inventory reuses recipe_library.

  Requirements:
  - backend server running locally on http://localhost:3000
  - DATABASE_URL or DB_* in backend/.env

  This test does NOT require GEMINI_API_KEY because it seeds recipe_library
  such that the reuse gate should trigger.
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000/api';

function randomEmail() {
  const suffix = Math.random().toString(36).slice(2);
  return `smoke.${suffix}@example.com`;
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

async function seedRecipeLibrary() {
  const connectionString = process.env.DATABASE_URL;
  const hasUrl = typeof connectionString === 'string' && connectionString.length > 0;

  const client = new Client(
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

  const title = 'Smoke Test Recipe Library Reuse';

  await client.connect();
  try {
    // Clean any prior seeds.
    await client.query('DELETE FROM recipe_library WHERE title = $1', [title]);

    const ingredients = [
      { name: 'Eggs', amount: '2' },
      { name: 'Spinach', amount: '1 cup' },
      { name: 'Milk', amount: '1/4 cup' },
    ];

    const ingredientNames = ingredients.map((x) => x.name);

    const inserted = await client.query(
      `INSERT INTO recipe_library (
        title, description, ingredients, instructions,
        ingredient_names, ingredient_signature,
        prep_time, cook_time, servings, calories,
        source, diet_tags, allergens,
        cuisine
      )
      VALUES (
        $1, $2, $3::jsonb, $4::jsonb,
        $5::text[], $6,
        $7, $8, $9, $10,
        'curated', $11::text[], $12::text[],
        $13
      )
      RETURNING id`,
      [
        title,
        'A tiny seeded recipe used to verify reuse gating.',
        JSON.stringify(ingredients),
        JSON.stringify(['Whisk eggs with milk', 'Cook with spinach']),
        ingredientNames,
        ingredientNames.map((n) => n.toLowerCase()).sort().join('|'),
        5,
        10,
        2,
        250,
        [],
        [],
        'italian',
      ]
    );

    const id = inserted.rows?.[0]?.id;
    if (!id) throw new Error('Failed to seed recipe_library');

    return { id, title };
  } finally {
    await client.end();
  }
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('This script requires Node.js 18+ (global fetch).');
  }

  console.log('Seeding recipe_library...');
  const seed = await seedRecipeLibrary();
  console.log('Seeded recipe id:', seed.id);

  console.log('Signing up temp user...');
  const email = randomEmail();
  const password = 'smoke-test-password';

  const signup = await httpJson(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Smoke' }),
  });

  const accessToken = signup?.accessToken;
  if (!accessToken) throw new Error('No accessToken returned from signup');

  console.log('Fetching user profile...');
  const profile = await httpJson(`${BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const inventory = [
    { id: 'i1', name: 'Eggs', quantity: '2', category: 'dairy' },
    { id: 'i2', name: 'Spinach', quantity: '200g', category: 'produce' },
    { id: 'i3', name: 'Milk', quantity: '1L', category: 'dairy' },
  ];

  const prefs = { mealType: 'any', maxTimeMinutes: 30, servings: 2 };

  console.log('Calling /ai/recipes-from-inventory...');
  const recipes = await httpJson(`${BASE_URL}/ai/recipes-from-inventory`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ inventory, user: profile, prefs }),
  });

  if (!Array.isArray(recipes) || recipes.length === 0) {
    throw new Error('Expected recipes array response');
  }

  const top = recipes[0];
  console.log('Top recipe id:', top?.id);
  console.log('Top recipe title:', top?.title);

  if (top?.id !== seed.id) {
    throw new Error(
      `Expected reuse of seeded recipe id ${seed.id} but got ${String(top?.id)}`
    );
  }

  console.log('✅ Smoke test passed: endpoint reused recipe_library.');
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err?.message || err);
  if (err?.payload) {
    console.error('Payload:', JSON.stringify(err.payload, null, 2));
  }
  process.exit(1);
});
