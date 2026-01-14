-- Add AI usage tracking table for per-user daily quota

CREATE TABLE IF NOT EXISTS ai_usage_daily (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    requests_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage_daily(user_id, day);

-- Requires update_updated_at_column() to exist (it is created in the base schema)
DROP TRIGGER IF EXISTS update_ai_usage_daily_updated_at ON ai_usage_daily;
CREATE TRIGGER update_ai_usage_daily_updated_at
BEFORE UPDATE ON ai_usage_daily
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
