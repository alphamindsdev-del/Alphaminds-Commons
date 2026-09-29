import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES, WEEKLY_HOUSE_THEME } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { getDailyContentCache, setDailyContentCache } from '../lib/kv.js';
import { houseScoreColumn, touchActivity } from '../lib/scoring.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const dailyRouter = new Hono<{ Bindings: Env }>();

function getDateInTimezone(tz: string): { dateStr: string; dayName: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
  });
  const dayName = dayFormatter.format(now).toLowerCase();
  return { dateStr, dayName };
}

dailyRouter.get('/today', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const member = await c.env.DB.prepare(
    'SELECT primary_house, timezone FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ primary_house: string; timezone: string }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const tz = member.timezone || 'UTC';
  const { dateStr, dayName: dayOfWeek } = getDateInTimezone(tz);
  const now = new Date();

  const themeHouse = WEEKLY_HOUSE_THEME[dayOfWeek] || member.primary_house;
  const house = themeHouse === 'global' ? member.primary_house : themeHouse;

  const cached = await getDailyContentCache(c.env, dateStr);
  if (cached) {
    const content = JSON.parse(cached);
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO daily_content_deliveries (id, member_id, content_id, delivery_date, delivered_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), session.member_id, (content as any).id, dateStr, now.toISOString()).run();
    const delivery = await c.env.DB.prepare(
      'SELECT * FROM daily_content_deliveries WHERE member_id = ? AND delivery_date = ?'
    ).bind(session.member_id, dateStr).first();
    return c.json({ content, delivery: delivery ? { id: (delivery as any).id, member_id: session.member_id, content_id: (delivery as any).content_id, delivery_date: dateStr, delivered_at: (delivery as any).delivered_at, completed_at: (delivery as any).completed_at } : null, cached: true });
  }

  const content = await c.env.DB.prepare(
    `SELECT * FROM daily_content
     WHERE (house = ? OR house = 'global')
       AND deleted_at IS NULL
       AND is_published = 1
       AND (scheduled_date = ? OR scheduled_date = ? OR (scheduled_date IS NULL AND day_of_week = ?))
     ORDER BY
       CASE WHEN scheduled_date = ? THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`
  ).bind(house, dateStr, dateStr, dayOfWeek, dateStr).first();

  if (!content) {
    return c.json({ content: null, delivery: null });
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO daily_content_deliveries (id, member_id, content_id, delivery_date, delivered_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, (content as any).id, dateStr, now.toISOString()).run();
  const delivery = await c.env.DB.prepare(
    'SELECT * FROM daily_content_deliveries WHERE member_id = ? AND delivery_date = ?'
  ).bind(session.member_id, dateStr).first();

  await setDailyContentCache(c.env, dateStr, JSON.stringify(content));

  return c.json({ content, delivery: delivery ? { id: (delivery as any).id, member_id: session.member_id, content_id: (delivery as any).content_id, delivery_date: dateStr, delivered_at: (delivery as any).delivered_at, completed_at: (delivery as any).completed_at } : null, cached: false });
});

dailyRouter.get('/previous', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const member = await c.env.DB.prepare(
    'SELECT timezone FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ timezone: string }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const tz = member.timezone || 'UTC';
  const { dateStr } = getDateInTimezone(tz);

  const previous = await c.env.DB.prepare(
    `SELECT id, title, body, house, content_type, media_r2_key, scheduled_date, day_of_week, created_at
     FROM daily_content
     WHERE deleted_at IS NULL
       AND is_published = 1
       AND scheduled_date IS NOT NULL
       AND scheduled_date < ?
     ORDER BY scheduled_date DESC, created_at DESC
     LIMIT 50`
  ).bind(dateStr).all();

  return c.json({ data: previous.results });
});

dailyRouter.post('/:contentId/complete', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { contentId } = c.req.param();
  const now = new Date();

  const member = await c.env.DB.prepare(
    'SELECT timezone, primary_house FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ timezone: string; primary_house: string }>();

  const tz = member?.timezone || 'UTC';
  const { dateStr } = getDateInTimezone(tz);

  const delivery = await c.env.DB.prepare(
    `SELECT d.*, c.house as content_house
     FROM daily_content_deliveries d
     JOIN daily_content c ON c.id = d.content_id
     WHERE d.content_id = ? AND d.member_id = ? AND d.delivery_date = ? AND d.completed_at IS NULL`
  ).bind(contentId, session.member_id, dateStr).first<any>();

  if (!delivery) {
    return c.json({ error: 'No pending delivery found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'UPDATE daily_content_deliveries SET completed_at = ? WHERE id = ?'
  ).bind(now.toISOString(), delivery.id).run();

  const house = delivery.content_house === 'global' ? member?.primary_house : delivery.content_house;
  const col = houseScoreColumn(house);
  const points = 5;

  await c.env.DB.prepare(
    `UPDATE member_stats SET total_points = total_points + ?, ${col} = ${col} + ?, total_score = total_score + ?, updated_at = ? WHERE member_id = ?`
  ).bind(points, points, points, now.toISOString(), session.member_id).run();

  await touchActivity(c.env, session.member_id, now);

  return c.json({ success: true, points_awarded: points });
});
