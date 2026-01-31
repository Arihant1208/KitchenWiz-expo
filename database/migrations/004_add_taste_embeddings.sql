-- Migration: Add taste embeddings and interaction signals
-- For user preference learning and novelty scoring

-- User taste embeddings (latent preference vector)
CREATE TABLE IF NOT EXISTS user_taste_embeddings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL DEFAULT '[]',
  interaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipe embeddings (cached, computed from recipe metadata)
CREATE TABLE IF NOT EXISTS recipe_embeddings (
  recipe_id UUID PRIMARY KEY REFERENCES recipe_library(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interaction signals for taste learning
CREATE TABLE IF NOT EXISTS interaction_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipe_library(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('cooked', 'skipped', 'thumbs_up', 'thumbs_down', 'repeated', 'edited')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_interaction_signals_user_recipe
  ON interaction_signals (user_id, recipe_id);

CREATE INDEX IF NOT EXISTS idx_interaction_signals_user_time
  ON interaction_signals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interaction_signals_recipe
  ON interaction_signals (recipe_id);

-- Trigger to update updated_at on user_taste_embeddings
CREATE OR REPLACE FUNCTION update_user_taste_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_taste_embeddings_updated_at ON user_taste_embeddings;
CREATE TRIGGER user_taste_embeddings_updated_at
  BEFORE UPDATE ON user_taste_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_taste_updated_at();
