import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleDailyContentDelivery(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'daily_content_delivery', scheduledTime);
  try {
    const today = formatDate(scheduledTime);
    const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][scheduledTime.getUTCDay()];

    const content = await env.DB.prepare(`
      SELECT id, house, content_type, title, body, media_r2_key
      FROM daily_content
      WHERE (scheduled_date = ? OR (scheduled_date IS NULL AND day_of_week = ?))
        AND is_published = 1 AND deleted_at IS NULL
      ORDER BY scheduled_date DESC, created_at DESC LIMIT 1
    `).bind(today, dayOfWeek).first<{ id: string; house: string; content_type: string; title: string; body: string; media_r2_key: string | null }>();

    if (!content) {
      await env.ALPHAMINDS_SESSIONS.put(
        `admin:alert:daily_content_delivery:${today}`,
        JSON.stringify({ job: 'daily_content_delivery', error: 'No content scheduled for today', at: scheduledTime.toISOString() }),
        { expirationTtl: 172800 }
      );
      await completeCronLog(env, logId, 0);
      return;
    }

    await env.ALPHAMINDS_CONTENT_SCHEDULE_CACHE.put(
      `content:schedule:${today}`,
      JSON.stringify(content),
      { expirationTtl: 90000 }
    );

    let recordsProcessed = 0;
    let lastId = '';
    while (true) {
      const members = await env.DB.prepare(`
        SELECT id FROM members WHERE is_active = 1 AND deleted_at IS NULL AND id > ? ORDER BY id ASC LIMIT 500
      `).bind(lastId).all<{ id: string }>();

      if (!members.results.length) break;

      for (const member of members.results) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO daily_content_deliveries (member_id, content_id, delivery_date)
          VALUES (?, ?, ?)
        `).bind(member.id, content.id, today).run();

        await env.ALPHAMINDS_DAILY_DELIVERY.put(
          `daily:${member.id}:${today}`,
          JSON.stringify({ content_id: content.id, delivered_at: new Date().toISOString(), completed_at: null }),
          { expirationTtl: 172800 }
        );
        recordsProcessed++;
      }

      lastId = members.results[members.results.length - 1]!.id;
    }

    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:daily_content_delivery:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'daily_content_delivery', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
