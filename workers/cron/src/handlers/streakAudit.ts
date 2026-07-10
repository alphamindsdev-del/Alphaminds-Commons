import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleStreakAudit(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'streak_audit', scheduledTime);
  try {
    const yesterday = new Date(scheduledTime.getTime() - 86400000);
    const yesterdayStart = formatDate(yesterday) + 'T00:00:00.000Z';

    let recordsProcessed = 0;
    let lastId = '';
    while (true) {
      const members = await env.DB.prepare(`
        SELECT ms.id, ms.member_id, ms.last_activity_at
        FROM member_stats ms
        JOIN members m ON m.id = ms.member_id
        WHERE m.is_active = 1 AND m.deleted_at IS NULL AND ms.id > ?
        ORDER BY ms.id ASC LIMIT 500
      `).bind(lastId).all<{ id: string; member_id: string; last_activity_at: string | null }>();

      if (!members.results.length) break;

      for (const member of members.results) {
        if (!member.last_activity_at || member.last_activity_at < yesterdayStart) {
          await env.DB.prepare(`
            UPDATE member_stats SET current_streak_days = 0 WHERE member_id = ?
          `).bind(member.member_id).run();
          recordsProcessed++;
        }
      }

      lastId = members.results[members.results.length - 1]!.id;
    }

    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:streak_audit:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'streak_audit', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
