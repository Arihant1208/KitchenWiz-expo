-- Add global recipe library for reuse/gating

-- Best-effort: enable extensions if available.
-- (Some hosted Postgres instances may not have contrib extensions enabled.)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN undefined_file THEN
  RAISE NOTICE 'uuid-ossp extension not available';
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN undefined_file THEN
  RAISE NOTICE 'pg_trgm extension not available (text similarity will be limited)';
END $$;

-- Library is shared across users; created_by_user_id is optional.
CREATE TABLE IF NOT EXISTS recipe_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::JSONB,
  instructions JSONB NOT NULL DEFAULT '[]'::JSONB,
  ingredient_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ingredient_signature TEXT,
  search_document tsvector,

  cuisine TEXT,
  meal_type TEXT,
  diet_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  allergens TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  calories INTEGER,

  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'curated', 'user_submitted')),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  quality_score DOUBLE PRECISION,
  usage_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  thumbs_up INTEGER NOT NULL DEFAULT 0,
  thumbs_down INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search: use a stored tsvector column (index expressions require IMMUTABLE functions)
ALTER TABLE recipe_library
  ADD COLUMN IF NOT EXISTS search_document tsvector;

CREATE OR REPLACE FUNCTION recipe_library_update_search_document()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || array_to_string(coalesce(NEW.ingredient_names, ARRAY[]::text[]), ' ')
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_recipe_library_search_document ON recipe_library;
CREATE TRIGGER update_recipe_library_search_document
BEFORE INSERT OR UPDATE OF title, description, ingredient_names
ON recipe_library
FOR EACH ROW
EXECUTE FUNCTION recipe_library_update_search_document();

-- Backfill existing rows
UPDATE recipe_library
SET search_document = to_tsvector(
  'english',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || array_to_string(coalesce(ingredient_names, ARRAY[]::text[]), ' ')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_library_meal_type ON recipe_library(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipe_library_total_time ON recipe_library((coalesce(prep_time,0) + coalesce(cook_time,0)));
CREATE INDEX IF NOT EXISTS idx_recipe_library_ingredient_names_gin ON recipe_library USING GIN (ingredient_names);
CREATE INDEX IF NOT EXISTS idx_recipe_library_diet_tags_gin ON recipe_library USING GIN (diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipe_library_allergens_gin ON recipe_library USING GIN (allergens);
DROP INDEX IF EXISTS idx_recipe_library_search_tsv;
CREATE INDEX IF NOT EXISTS idx_recipe_library_search_document ON recipe_library USING GIN (search_document);

-- Requires update_updated_at_column() to exist (it is created in the base schema)
DROP TRIGGER IF EXISTS update_recipe_library_updated_at ON recipe_library;
CREATE TRIGGER update_recipe_library_updated_at
BEFORE UPDATE ON recipe_library
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
