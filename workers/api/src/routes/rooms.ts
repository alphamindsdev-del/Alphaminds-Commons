import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const roomsRouter = new Hono<{ Bindings: Env }>();

roomsRouter.get('/:roomId', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { roomId } = c.req.param();

  const room = await c.env.DB.prepare(
    'SELECT * FROM rooms WHERE id = ? AND deleted_at IS NULL'
  ).bind(roomId).first();

  if (!room) {
    return c.json({ error: 'Room not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const membership = await c.env.DB.prepare(
    'SELECT 1 FROM room_memberships WHERE room_id = ? AND member_id = ? AND deleted_at IS NULL'
  ).bind(roomId, session.member_id).first();

  return c.json({ ...room as any, is_member: membership !== null });
});

roomsRouter.post('/:roomId/join', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { roomId } = c.req.param();
  const now = new Date().toISOString();

  const room = await c.env.DB.prepare(
    'SELECT * FROM rooms WHERE id = ? AND deleted_at IS NULL'
  ).bind(roomId).first();

  if (!room) {
    return c.json({ error: 'Room not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM room_memberships WHERE room_id = ? AND member_id = ? AND deleted_at IS NULL'
  ).bind(roomId, session.member_id).first();

  if (existing) {
    return c.json({ error: 'Already a member', code: ERROR_CODES.VALIDATION_ERROR }, 409);
  }

  await c.env.DB.prepare(
    'INSERT INTO room_memberships (id, room_id, member_id, role, joined_at, created_at, updated_at) VALUES (?, ?, ?, \'member\', ?, ?, ?)'
  ).bind(crypto.randomUUID(), roomId, session.member_id, now, now, now).run();

  await c.env.DB.prepare(
    'UPDATE rooms SET member_count = member_count + 1 WHERE id = ? AND deleted_at IS NULL'
  ).bind(roomId).run();

  return c.json({ success: true });
});

roomsRouter.post('/:roomId/leave', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { roomId } = c.req.param();

  const membership = await c.env.DB.prepare(
    'SELECT id FROM room_memberships WHERE room_id = ? AND member_id = ? AND deleted_at IS NULL'
  ).bind(roomId, session.member_id).first<{ id: string }>();

  if (!membership) {
    return c.json({ error: 'Not a member of this room', code: ERROR_CODES.VALIDATION_ERROR }, 404);
  }

  await c.env.DB.prepare(
    'UPDATE room_memberships SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(membership.id).run();

  await c.env.DB.prepare(
    'UPDATE rooms SET member_count = MAX(0, member_count - 1) WHERE id = ? AND deleted_at IS NULL'
  ).bind(roomId).run();

  return c.json({ success: true });
});

export const chapterRoomsRouter = new Hono<{ Bindings: Env }>();

chapterRoomsRouter.get('/:chapterId/rooms', authMiddleware, async (c) => {
  const { chapterId } = c.req.param();
  const house = c.req.query('house');
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];

  const baseConditions = 'chapter_id = ? AND deleted_at IS NULL';
  const houseCondition = house ? ' AND house = ?' : '';

  if (cursor) {
    queryStr = `SELECT * FROM rooms WHERE ${baseConditions}${houseCondition} AND id > ? ORDER BY id ASC LIMIT ?`;
    bindParams = house ? [chapterId, house, cursor, actualLimit] : [chapterId, cursor, actualLimit];
  } else {
    queryStr = `SELECT * FROM rooms WHERE ${baseConditions}${houseCondition} ORDER BY id ASC LIMIT ?`;
    bindParams = house ? [chapterId, house, actualLimit] : [chapterId, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).id : null,
      has_more: hasMore,
      limit,
    },
  });
});
