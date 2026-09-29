import { Env } from '../../../shared/types.js';

export const HOUSE_SCORE_COLUMNS: Record<string, string> = {
  becoming: 'becoming_score',
  connection: 'connection_score',
  wellness: 'wellness_score',
  fun: 'play_score',
  humanity: 'humanity_score',
};

export function houseScoreColumn(house?: string | null): string {
  return HOUSE_SCORE_COLUMNS[(house ?? 'wellness')] ?? 'wellness_score';
}

export async function touchActivity(env: Env, memberId: string, now: Date = new Date()): Promise<void> {
  const nowIso = now.toISOString();
  const todayStart = nowIso.slice(0, 10) + 'T00:00:00.000Z';
  await env.DB.prepare(
    `UPDATE member_stats SET
      last_activity_at = ?,
      current_streak_days = CASE WHEN last_activity_at IS NULL OR last_activity_at < ? THEN current_streak_days + 1 ELSE current_streak_days END,
      longest_streak_days = CASE WHEN last_activity_at IS NULL OR last_activity_at < ? THEN MAX(longest_streak_days, current_streak_days + 1) ELSE longest_streak_days END,
      updated_at = ?
     WHERE member_id = ?`
  ).bind(nowIso, todayStart, todayStart, nowIso, memberId).run();
}
