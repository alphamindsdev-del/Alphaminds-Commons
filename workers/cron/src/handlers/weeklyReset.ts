import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleWeeklyReset(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'weekly_reset', scheduledTime);
  try {
    const lastWeek = new Date(scheduledTime.getTime() - 7 * 86400000).toISOString();

    const endedChallenges = await env.DB.prepare(`
      SELECT id, target_value FROM challenges
      WHERE is_active = 1 AND deleted_at IS NULL AND ends_at IS NOT NULL
        AND ends_at >= ? AND ends_at < ?
    `).bind(lastWeek, scheduledTime.toISOString()).all<{ id: string; target_value: number | null }>();

    let recordsProcessed = 0;

    for (const challenge of endedChallenges.results) {
      const completed = await env.DB.prepare(`
        UPDATE challenge_participations
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE challenge_id = ? AND status = 'active' AND current_value >= target_value AND target_value IS NOT NULL
      `).bind(challenge.id).run();
      recordsProcessed += completed.meta.changes ?? 0;

      const abandoned = await env.DB.prepare(`
        UPDATE challenge_participations
        SET status = 'abandoned'
        WHERE challenge_id = ? AND status = 'active' AND (target_value IS NULL OR current_value < target_value)
      `).bind(challenge.id).run();
      recordsProcessed += abandoned.meta.changes ?? 0;
    }

    const directCompletions = await env.DB.prepare(`
      UPDATE challenge_participations
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND current_value >= target_value AND target_value IS NOT NULL
        AND challenge_id NOT IN (
          SELECT id FROM challenges WHERE ends_at IS NOT NULL AND ends_at >= ?
        )
    `).bind(scheduledTime.toISOString()).run();
    recordsProcessed += directCompletions.meta.changes ?? 0;

    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:weekly_reset:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'weekly_reset', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
