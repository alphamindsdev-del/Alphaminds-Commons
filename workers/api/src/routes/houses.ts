import { Hono } from 'hono';
import { Env } from '../../../shared/types.js';
import { HOUSES, ERROR_CODES } from '../../../shared/constants.js';

export const housesRouter = new Hono<{ Bindings: Env }>();

housesRouter.get('/', async (c) => {
  const results = [];
  for (const house of HOUSES) {
    const roomCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM rooms WHERE house = ? AND deleted_at IS NULL'
    ).bind(house).first<{ count: number }>();

    const memberCount = await c.env.DB.prepare(
      'SELECT COUNT(DISTINCT member_id) as count FROM member_house_selections WHERE house = ? AND deleted_at IS NULL'
    ).bind(house).first<{ count: number }>();

    const eventCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM events WHERE house = ? AND deleted_at IS NULL AND is_published = 1 AND starts_at > datetime('now')"
    ).bind(house).first<{ count: number }>();

    results.push({
      house,
      room_count: roomCount?.count ?? 0,
      member_count: memberCount?.count ?? 0,
      event_count: eventCount?.count ?? 0,
    });
  }
  return c.json({ data: results });
});

housesRouter.get('/:houseId', async (c) => {
  const { houseId } = c.req.param();

  if (!HOUSES.includes(houseId as any)) {
    return c.json({ error: 'House not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const house = await c.env.DB.prepare(
    'SELECT * FROM houses WHERE id = ?'
  ).bind(houseId).first();

  if (!house) {
    return c.json({ error: 'House not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const rooms = await c.env.DB.prepare(
    'SELECT * FROM rooms WHERE house = ? AND deleted_at IS NULL'
  ).bind(houseId).all();

  const upcomingEvents = await c.env.DB.prepare(
    "SELECT * FROM events WHERE house = ? AND deleted_at IS NULL AND is_published = 1 AND starts_at > datetime('now') ORDER BY starts_at ASC"
  ).bind(houseId).all();

  const activeChallenges = await c.env.DB.prepare(
    'SELECT * FROM challenges WHERE house = ? AND deleted_at IS NULL AND is_active = 1'
  ).bind(houseId).all();

  return c.json({
    ...house as any,
    rooms: rooms.results,
    upcoming_events: upcomingEvents.results,
    active_challenges: activeChallenges.results,
  });
});
