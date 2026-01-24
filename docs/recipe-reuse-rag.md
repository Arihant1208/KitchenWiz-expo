# Recipe Reuse + RAG Gate (KitchenWiz)

This document describes how KitchenWiz evolves from **always generating** recipes to a system that:

- **Retrieves** good matches from an internal recipe library when possible
- **Generates** only when retrieval is insufficient
- **Stores** the best new recipes so results improve over time

The goal is to avoid duplicates/mismatches while keeping latency and complexity reasonable.

---

## Current behavior

Endpoint: `POST /api/ai/recipes-from-inventory`

- Gemini generates 3 recipes from the provided inventory + user profile.
- No persistent library is consulted.
- No deduplication or reuse gate.

---

## Target behavior (minimal milestone)

### Retrieve → Rank → Gate → (Maybe) Generate → Dedupe → Store

1. **Build query object** from `inventory`, `user`, and `prefs`.
2. **Retrieve candidates** from the `recipe_library` table using deterministic filters + text search.
3. **Score candidates** with a composite score:
   - inventory coverage
   - constraint satisfaction
   - quality/feedback
4. **Reuse gate**:
   - If the top candidate is “good enough” → return top 3 from DB.
   - Else → generate 3 via Gemini.
5. **Deduplicate before saving**:
   - compare ingredient signature overlap vs existing recipes
   - if too similar, skip saving (still return to user)
6. **Store** the best new recipe in `recipe_library` so future calls can reuse it.

This keeps the **frontend payload unchanged**: the endpoint still returns an array of 3 recipe objects.

---

## Data model

### `recipe_library`
A global (shared) library of recipes, with optional per-user authorship.

Core fields:
- `id` (UUID)
- `title`, `description`
- `ingredients` (JSONB: array of `{ name, amount }`)
- `instructions` (JSONB: array of strings)
- `prep_time`, `cook_time`, `calories`, `servings`
- `meal_type` (e.g., breakfast/lunch/dinner/any)
- `diet_tags` (TEXT[]), `allergens` (TEXT[])
- `ingredient_names` (TEXT[])
- `ingredient_signature` (TEXT) — stable fingerprint for dedupe (normalized ingredient list)
- `quality_score` (0..1), `usage_count`, `save_count`, `thumbs_up`, `thumbs_down`
- `source` (`generated` | `curated` | `user_submitted`)
- `created_by_user_id` (nullable)
- `created_at`, `updated_at`

### Embeddings (future)

The recommended production direction is **Postgres + pgvector**:
- either `recipe_embeddings(recipe_id, embedding vector(N))`
- or an `embedding vector(N)` column on `recipe_library`

This milestone focuses on the **gate and deterministic correctness** first; semantic ranking can be added once an embedding model is chosen and pgvector is available in the target DB.

---

## Retrieval strategy

### Stage 1: hard filters (SQL)
Filters that must not be violated:
- `meal_type` (if provided)
- `total_time <= maxTime`
- diet restrictions (best-effort tag matching)
- allergies (exclude recipes containing allergens)
- must-include ingredient (when provided)

### Stage 2: ranking (application)
Rank remaining candidates by composite score:

- **Inventory coverage**: fraction of recipe ingredients present in inventory
- **Preference match**: cuisine/meal-type match, must-include satisfied
- **Quality**: `quality_score` + feedback stats

---

## Reuse vs Generate gate

Example thresholds (tunable):

- Reuse if `composite_score >= 0.78` and `missing_ingredients <= 3`
- Otherwise generate new

Why:
- prevents returning a “technically similar” recipe that doesn’t fit inventory
- prevents over-generation

---

## Deduplication

Before saving generated recipes:

- compute `ingredient_signature` for each candidate
- compute Jaccard overlap with nearest existing recipes (by rough filters + text match)
- if overlap is above a threshold (e.g., `>= 0.85`), treat as duplicate and **don’t save**

Storing can be expanded later to support “variants of recipe_id=X”.

---

## Planned follow-ups

- Add **thumbs up/down** and **save** feedback endpoints that update `recipe_library` stats.
- Add **ingredient catalog** (canonicalization + synonyms) for stronger inventory matching.
- Add **embeddings + pgvector** for semantic similarity ranking.
- Add async background jobs:
  - embedding generation
  - LLM judge scoring into `quality_score`

