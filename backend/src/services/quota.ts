/**
 * Quota Service
 *
 * Manages AI usage tracking and rate limiting.
 */

import { query } from '../db';
import { DAILY_AI_REQUEST_LIMIT } from '../constants';
import { getLocalDayKey } from '../helpers';

export interface QuotaInfo {
  used: number;
  limit: number;
  day: string;
  exceeded: boolean;
}

/**
 * Increment daily AI usage for a user and return new count.
 */
export async function incrementDailyUsage(userId: string, dayKey: string): Promise<number> {
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

/**
 * Get current daily usage for a user.
 */
export async function getDailyUsage(userId: string, dayKey: string): Promise<number> {
  const result = await query(
    `SELECT requests_count FROM ai_usage_daily WHERE user_id = $1 AND day = $2::date`,
    [userId, dayKey]
  );

  return Number(result.rows?.[0]?.requests_count ?? 0);
}

/**
 * Check and increment quota, returning quota info.
 */
export async function checkAndIncrementQuota(
  userId: string,
  req: { header: (name: string) => string | string[] | undefined }
): Promise<QuotaInfo> {
  const dayKey = getLocalDayKey(req);
  const count = await incrementDailyUsage(userId, dayKey);

  return {
    used: count,
    limit: DAILY_AI_REQUEST_LIMIT,
    day: dayKey,
    exceeded: count > DAILY_AI_REQUEST_LIMIT,
  };
}

/**
 * Get remaining quota for a user.
 */
export async function getRemainingQuota(
  userId: string,
  req: { header: (name: string) => string | string[] | undefined }
): Promise<number> {
  const dayKey = getLocalDayKey(req);
  const used = await getDailyUsage(userId, dayKey);
  return Math.max(0, DAILY_AI_REQUEST_LIMIT - used);
}
