import { Hono } from 'hono';
import { Env } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware } from '../middleware/auth.js';

export const libraryRouter = new Hono<{ Bindings: Env }>();

libraryRouter.get('/', async (c) => {
  const cursor = c.req.query('cursor');
  const house = c.req.query('house');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const conditions = ['deleted_at IS NULL', 'is_published = 1'];
  const params: any[] = [];
  if (house) { conditions.push('house = ?'); params.push(house); }

  const where = conditions.join(' AND ');
  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = `SELECT * FROM library_articles WHERE ${where} AND created_at < ? ORDER BY created_at DESC LIMIT ?`;
    bindParams = [...params, cursor, actualLimit];
  } else {
    queryStr = `SELECT * FROM library_articles WHERE ${where} ORDER BY created_at DESC LIMIT ?`;
    bindParams = [...params, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).created_at : null,
      has_more: hasMore,
      limit,
    },
  });
});

libraryRouter.get('/:id', async (c) => {
  const { id } = c.req.param();
  const article = await c.env.DB.prepare(
    'SELECT * FROM library_articles WHERE id = ? AND deleted_at IS NULL AND is_published = 1'
  ).bind(id).first();

  if (!article) {
    return c.json({ error: 'Article not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  return c.json(article);
});
