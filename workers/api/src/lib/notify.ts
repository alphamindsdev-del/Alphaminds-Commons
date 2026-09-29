import { Env } from '../../../shared/types.js';

export async function createNotification(
  env: Env,
  memberId: string,
  type: 'new_post' | 'new_comment' | 'new_event' | 'badge_awarded' | 'challenge_reminder' | 'daily_content',
  title: string,
  body?: string,
  actionUrl?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO notifications (id, member_id, type, title, body, action_url, is_read, push_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)'
  ).bind(crypto.randomUUID(), memberId, type, title, body ?? null, actionUrl ?? null, now).run();
}
