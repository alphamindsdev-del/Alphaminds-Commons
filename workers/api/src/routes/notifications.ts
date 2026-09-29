import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const notificationsRouter = new Hono<{ Bindings: Env }>();

notificationsRouter.get('/', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = 'SELECT * FROM notifications WHERE member_id = ? AND deleted_at IS NULL AND created_at < ? ORDER BY created_at DESC LIMIT ?';
    bindParams = [session.member_id, cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM notifications WHERE member_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?';
    bindParams = [session.member_id, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  const unreadCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE member_id = ? AND deleted_at IS NULL AND is_read = 0'
  ).bind(session.member_id).first<{ count: number }>();

  return c.json({
    data: data.map((n: any) => ({
      ...n,
      read: n.is_read === 1,
    })),
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).created_at : null,
      has_more: hasMore,
      limit,
    },
    unread_count: unreadCount?.count ?? 0,
  });
});

notificationsRouter.post('/read-all', authMiddleware, async (c) => {
  const session = getSession(c as any);

  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).run();

  return c.json({ success: true });
});

notificationsRouter.post('/:id/read', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();

  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND member_id = ? AND deleted_at IS NULL'
  ).bind(id, session.member_id).run();

  return c.json({ success: true });
});
