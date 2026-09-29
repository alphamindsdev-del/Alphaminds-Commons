import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { houseScoreColumn, touchActivity } from '../lib/scoring.js';

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

  const validHouses = ['becoming', 'connection', 'wellness', 'fun', 'humanity'];
  const roomHouse = (room as any).house as string;
  if (validHouses.includes(roomHouse)) {
    const col = houseScoreColumn(roomHouse);
    await c.env.DB.prepare(
      `UPDATE member_stats SET ${col} = ${col} + 1, total_score = total_score + 1, rooms_joined = rooms_joined + 1, updated_at = ? WHERE member_id = ?`
    ).bind(now, session.member_id).run();
  }

  await touchActivity(c.env, session.member_id, new Date(now));

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
  const session = getSession(c as any);
  const { chapterId } = c.req.param();
  const house = c.req.query('house');
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const chapterCondition = chapterId === 'global'
    ? '(r.chapter_id = ? OR r.chapter_id IS NULL)'
    : 'r.chapter_id = ?';
  const conditions = [chapterCondition, 'r.deleted_at IS NULL'];
  const whereParams: any[] = [chapterId];
  if (house) { conditions.push('r.house = ?'); whereParams.push(house); }
  if (cursor) { conditions.push('r.id > ?'); whereParams.push(cursor); }

  const queryStr = `SELECT r.*, CASE WHEN rm.id IS NOT NULL THEN 1 ELSE 0 END AS is_member
    FROM rooms r
    LEFT JOIN room_memberships rm ON rm.room_id = r.id AND rm.member_id = ? AND rm.deleted_at IS NULL
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.id ASC LIMIT ?`;

  const result = await c.env.DB.prepare(queryStr).bind(session.member_id, ...whereParams, actualLimit).all();
  const rows = (result.results as any[]).map((r) => ({ ...r, is_member: Boolean(r.is_member) }));
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
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
