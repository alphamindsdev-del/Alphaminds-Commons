import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleLeaderboardRecalculation(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'leaderboard_recalculation', scheduledTime);
  try {
    const now = scheduledTime.toISOString();
    const weekAgo = new Date(scheduledTime.getTime() - 7 * 86400000).toISOString();
    const today = formatDate(scheduledTime);

    const chapters = await env.DB.prepare(`
      SELECT id FROM chapters WHERE is_active = 1 AND deleted_at IS NULL
    `).all<{ id: string }>();

    const scopes: { type: string; id: string | null }[] = [{ type: 'global', id: null }];
    for (const ch of chapters.results) {
      scopes.push({ type: 'chapter', id: ch.id });
    }

    const inserts: D1PreparedStatement[] = [];

    for (const scope of scopes) {
      const memberQuery = scope.type === 'global'
        ? `SELECT ms.member_id, ms.total_score FROM member_stats ms JOIN members m ON m.id = ms.member_id WHERE m.deleted_at IS NULL ORDER BY ms.total_score DESC`
        : `SELECT ms.member_id, ms.total_score FROM member_stats ms JOIN members m ON m.id = ms.member_id WHERE m.chapter_id = ? AND m.deleted_at IS NULL ORDER BY ms.total_score DESC`;

      const params = scope.type === 'global' ? [] : [scope.id];

      const members = await env.DB.prepare(memberQuery).bind(...params).all<{ member_id: string; total_score: number }>();

      members.results.forEach((m, i) => {
        const rank = i + 1;
        inserts.push(
          env.DB.prepare(`
            INSERT INTO leaderboard_snapshots (snapshot_at, period_type, scope_type, scope_id, rank, member_id, score, created_at)
            VALUES (?, 'all_time', ?, ?, ?, ?, ?, ?)
          `).bind(now, scope.type, scope.id, rank, m.member_id, m.total_score, now)
        );
      });

      const weekMembers = scope.type === 'global'
        ? await env.DB.prepare(`
            SELECT ms.member_id, ms.total_score FROM member_stats ms JOIN members m ON m.id = ms.member_id
            WHERE m.deleted_at IS NULL AND ms.last_activity_at >= ? ORDER BY ms.total_score DESC
          `).bind(weekAgo).all<{ member_id: string; total_score: number }>()
        : await env.DB.prepare(`
            SELECT ms.member_id, ms.total_score FROM member_stats ms JOIN members m ON m.id = ms.member_id
            WHERE m.chapter_id = ? AND m.deleted_at IS NULL AND ms.last_activity_at >= ? ORDER BY ms.total_score DESC
          `).bind(scope.id, weekAgo).all<{ member_id: string; total_score: number }>();

      weekMembers.results.forEach((m, i) => {
        const rank = i + 1;
        inserts.push(
          env.DB.prepare(`
            INSERT INTO leaderboard_snapshots (snapshot_at, period_type, scope_type, scope_id, rank, member_id, score, created_at)
            VALUES (?, 'weekly', ?, ?, ?, ?, ?, ?)
          `).bind(now, scope.type, scope.id, rank, m.member_id, m.total_score, now)
        );
      });
    }

    if (inserts.length > 0) {
      await env.DB.batch(inserts);
    }

    await completeCronLog(env, logId, inserts.length);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:leaderboard_recalculation:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'leaderboard_recalculation', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
