import { Env } from '../../../shared/types.js';
import { parseSettings } from '../../../shared/settings.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleWeeklySummary(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'weekly_summary', scheduledTime);
  try {
    const today = formatDate(scheduledTime);
    const weekAgo = new Date(scheduledTime.getTime() - 7 * 86400000).toISOString();

    const members = await env.DB.prepare(`
      SELECT id, email, username, display_name, settings_json FROM members WHERE email_verified = 1 AND deleted_at IS NULL
    `).all<{ id: string; email: string; username: string; display_name: string; settings_json: string | null }>();

    let recordsProcessed = 0;

    for (const member of members.results) {
      const settings = parseSettings(member.settings_json);
      const wantsEmail = (settings.emailNotifications ?? false) && (settings.emailWeeklyDigest ?? true);
      if (!wantsEmail) continue;

      const stats = await env.DB.prepare(`
        SELECT total_score, impact_score, current_streak_days, volunteer_hours, challenges_completed, events_attended, detectors_completed
        FROM member_stats WHERE member_id = ?
      `).bind(member.id).first<{ total_score: number; impact_score: number; current_streak_days: number; volunteer_hours: number; challenges_completed: number; events_attended: number; detectors_completed: number }>();

      if (!stats) continue;

      const deliveries = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM daily_content_deliveries WHERE member_id = ? AND delivery_date >= ? AND completed_at IS NOT NULL
      `).bind(member.id, today).first<{ count: number }>();

      const html = `
        <h1>Your Weekly Summary, ${member.display_name || member.username}!</h1>
        <p>Here is how you did this week:</p>
        <ul>
          <li>Total Score: ${stats.total_score}</li>
          <li>Impact Score: ${stats.impact_score}</li>
          <li>Current Streak: ${stats.current_streak_days} days</li>
          <li>Volunteer Hours: ${stats.volunteer_hours}</li>
          <li>Challenges Completed: ${stats.challenges_completed}</li>
          <li>Events Attended: ${stats.events_attended}</li>
          <li>Detectors Completed: ${stats.detectors_completed}</li>
          <li>Content Completed: ${deliveries?.count ?? 0}</li>
        </ul>
        <p>Keep up the great work!</p>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AlphaMinds <noreply@alphaminds.org>',
          to: [member.email],
          subject: 'Your Weekly AlphaMinds Summary',
          html,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to send weekly summary to ${member.email}: ${text}`);
      }

      recordsProcessed++;
    }

    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:weekly_summary:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'weekly_summary', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
