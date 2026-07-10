import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleImpactScoreRecalculation(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'impact_score_recalculation', scheduledTime);
  try {
    let recordsProcessed = 0;
    let lastId = '';
    while (true) {
      const members = await env.DB.prepare(`
        SELECT ms.id, ms.member_id, ms.volunteer_hours, ms.challenges_completed, ms.detectors_completed
        FROM member_stats ms
        WHERE ms.id > ?
        ORDER BY ms.id ASC LIMIT 500
      `).bind(lastId).all<{ id: string; member_id: string; volunteer_hours: number; challenges_completed: number; detectors_completed: number }>();

      if (!members.results.length) break;

      for (const member of members.results) {
        const impactScore = (member.volunteer_hours * 10) + (member.challenges_completed * 5) + (member.detectors_completed * 15);
        await env.DB.prepare(`
          UPDATE member_stats SET impact_score = ? WHERE member_id = ?
        `).bind(impactScore, member.member_id).run();
        recordsProcessed++;
      }

      lastId = members.results[members.results.length - 1]!.id;
    }

    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:impact_score_recalculation:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'impact_score_recalculation', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
