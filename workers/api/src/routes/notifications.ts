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

  let query: ReturnType<typeof c.env.DB.prepare>;
  let bindParams: any[];

  if (cursor) {
    query = c.env.DB.prepare(
      'SELECT * FROM notifications WHERE member_id = ? AND deleted_at IS NULL AND id > ? ORDER BY id ASC LIMIT ?'
    );
    bindParams = [session.member_id, cursor, actualLimit];
  } else {
    query = c.env.DB.prepare(
      'SELECT * FROM notifications WHERE member_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT ?'
    );
    bindParams = [session.member_id, actualLimit];
  }

  const result = await query.bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  const unreadCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE member_id = ? AND deleted_at IS NULL AND is_read = 0'
  ).bind(session.member_id).first<{ count: number }>();

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).id : null,
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
