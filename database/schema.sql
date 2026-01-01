-- KitchenWiz Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_saved ON recipes(user_id, is_saved);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_user ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_provider_sub ON user_identities(provider, provider_sub);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

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

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_updated_at ON shopping_items;
CREATE TRIGGER update_shopping_updated_at BEFORE UPDATE ON shopping_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
