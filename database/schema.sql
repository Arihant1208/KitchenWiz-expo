-- KitchenWiz Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Best-effort: enable text similarity extension (optional)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN undefined_file THEN
    RAISE NOTICE 'pg_trgm extension not available (text similarity will be limited)';
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(255) NOT NULL DEFAULT 'Chef',
    dietary_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    cuisine_preferences TEXT[] DEFAULT ARRAY['Italian']::TEXT[],
    goals VARCHAR(50) DEFAULT 'maintenance' CHECK (goals IN ('weight-loss', 'muscle-gain', 'maintenance', 'budget-friendly')),
    cooking_skill VARCHAR(50) DEFAULT 'intermediate' CHECK (cooking_skill IN ('beginner', 'intermediate', 'advanced')),
    household_size INTEGER DEFAULT 2,
    max_cooking_time INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Passwords (email/password login)
CREATE TABLE IF NOT EXISTS user_passwords (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth / external identities
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'microsoft')),
    provider_sub TEXT NOT NULL,
    email VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_sub)
);

-- Refresh tokens (stored hashed)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by UUID REFERENCES refresh_tokens(id),
    user_agent TEXT,
    ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('produce', 'dairy', 'meat', 'pantry', 'frozen', 'other')),
    expiry_date DATE,
    calories_per_unit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients JSONB DEFAULT '[]'::JSONB,
    instructions JSONB DEFAULT '[]'::JSONB,
    prep_time INTEGER,
    cook_time INTEGER,
    calories INTEGER,
    match_score INTEGER,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Library (global) for reuse + ranking
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

-- Backfill for existing rows (safe to rerun)
UPDATE recipe_library
SET search_document = to_tsvector(
    'english',
    coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || array_to_string(coalesce(ingredient_names, ARRAY[]::text[]), ' ')
);

-- Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL,
    breakfast JSONB,
    lunch JSONB,
    dinner JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, day)
);

-- Shopping Items Table
CREATE TABLE IF NOT EXISTS shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('produce', 'dairy', 'meat', 'pantry', 'frozen', 'other')),
    checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI usage tracking (daily quota)
CREATE TABLE IF NOT EXISTS ai_usage_daily (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    requests_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, day)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_saved ON recipes(user_id, is_saved);
CREATE INDEX IF NOT EXISTS idx_recipe_library_meal_type ON recipe_library(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipe_library_total_time ON recipe_library((coalesce(prep_time,0) + coalesce(cook_time,0)));
CREATE INDEX IF NOT EXISTS idx_recipe_library_ingredient_names_gin ON recipe_library USING GIN (ingredient_names);
CREATE INDEX IF NOT EXISTS idx_recipe_library_diet_tags_gin ON recipe_library USING GIN (diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipe_library_allergens_gin ON recipe_library USING GIN (allergens);
DROP INDEX IF EXISTS idx_recipe_library_search_tsv;
CREATE INDEX IF NOT EXISTS idx_recipe_library_search_document ON recipe_library USING GIN (search_document);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_user ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage_daily(user_id, day);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_provider_sub ON user_identities(provider, provider_sub);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_user ON email_verification_tokens(user_id);

-- Insert default user (for development/demo)
INSERT INTO users (id, name, dietary_restrictions, allergies, cuisine_preferences, goals, cooking_skill, household_size, max_cooking_time)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Chef',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['Italian']::TEXT[],
    'maintenance',
    'intermediate',
    2,
    60
) ON CONFLICT (id) DO NOTHING;

-- Insert sample inventory items (for development/demo)
INSERT INTO inventory_items (user_id, name, quantity, category, expiry_date) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Eggs', '12', 'dairy', CURRENT_DATE + INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Spinach', '200g', 'produce', CURRENT_DATE + INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Chicken Breast', '500g', 'meat', CURRENT_DATE + INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Rice', '1kg', 'pantry', CURRENT_DATE + INTERVAL '180 days'),
    ('00000000-0000-0000-0000-000000000001', 'Milk', '1L', 'dairy', CURRENT_DATE + INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Tomatoes', '500g', 'produce', CURRENT_DATE + INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_passwords_updated_at ON user_passwords;
CREATE TRIGGER update_user_passwords_updated_at BEFORE UPDATE ON user_passwords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_identities_updated_at ON user_identities;
CREATE TRIGGER update_user_identities_updated_at BEFORE UPDATE ON user_identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipe_library_updated_at ON recipe_library;
CREATE TRIGGER update_recipe_library_updated_at BEFORE UPDATE ON recipe_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_updated_at ON shopping_items;
CREATE TRIGGER update_shopping_updated_at BEFORE UPDATE ON shopping_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_usage_daily_updated_at ON ai_usage_daily;
CREATE TRIGGER update_ai_usage_daily_updated_at BEFORE UPDATE ON ai_usage_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
