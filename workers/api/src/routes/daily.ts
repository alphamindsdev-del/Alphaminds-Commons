import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES, WEEKLY_HOUSE_THEME } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { getDailyDelivery, setDailyDelivery } from '../lib/kv.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const dailyRouter = new Hono<{ Bindings: Env }>();

dailyRouter.get('/today', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[now.getUTCDay()]!;

  const cached = await getDailyDelivery(c.env, session.member_id, dateStr);
  if (cached) {
    const parsed = JSON.parse(cached);
    return c.json({ content: parsed.content, delivery: parsed.delivery, cached: true });
  }

  const member = await c.env.DB.prepare(
    'SELECT primary_house FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ primary_house: string }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const themeHouse = WEEKLY_HOUSE_THEME[dayOfWeek] || member.primary_house;
  const house = themeHouse === 'global' ? member.primary_house : themeHouse;

  const content = await c.env.DB.prepare(
    'SELECT * FROM daily_content WHERE (house = ? OR house = \'global\') AND deleted_at IS NULL AND is_published = 1 AND (scheduled_date = ? OR (scheduled_date IS NULL AND day_of_week = ?)) ORDER BY created_at DESC LIMIT 1'
  ).bind(house, dateStr, dayOfWeek).first();

  if (!content) {
    return c.json({ error: 'No content available today', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const deliveryId = crypto.randomUUID();
  const delivery = {
    id: deliveryId,
    member_id: session.member_id,
    content_id: (content as any).id,
    delivery_date: dateStr,
    delivered_at: now.toISOString(),
    completed_at: null,
  };

  await c.env.DB.prepare(
    'INSERT INTO daily_content_deliveries (id, member_id, content_id, delivery_date, delivered_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(deliveryId, session.member_id, (content as any).id, dateStr, now.toISOString()).run();

  await setDailyDelivery(c.env, session.member_id, dateStr, JSON.stringify({ content, delivery }));

  return c.json({ content, delivery, cached: false });
});

dailyRouter.post('/:contentId/complete', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { contentId } = c.req.param();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const delivery = await c.env.DB.prepare(
    'SELECT * FROM daily_content_deliveries WHERE content_id = ? AND member_id = ? AND delivery_date = ? AND completed_at IS NULL'
  ).bind(contentId, session.member_id, dateStr).first();

  if (!delivery) {
    return c.json({ error: 'No pending delivery found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'UPDATE daily_content_deliveries SET completed_at = ? WHERE id = ?'
  ).bind(now.toISOString(), (delivery as any).id).run();

  const stats = await c.env.DB.prepare(
    'SELECT * FROM member_stats WHERE member_id = ?'
  ).bind(session.member_id).first<any>();
  if (stats) {
    await c.env.DB.prepare(
      'UPDATE member_stats SET total_points = total_points + 5, wellness_score = wellness_score + 5, updated_at = ? WHERE member_id = ?'
    ).bind(now.toISOString(), session.member_id).run();
  }

  await setDailyDelivery(c.env, session.member_id, dateStr, JSON.stringify({ completed: true }));

  return c.json({ success: true, points_awarded: 5 });
});
