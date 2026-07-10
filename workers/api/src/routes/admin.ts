import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { CreateDailyContentSchema, CreateDailyContentInput, UpdateMemberAdminSchema, UpdateMemberAdminInput, CreateChapterSchema, CreateChapterInput } from '../lib/validation.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use('*', authMiddleware as any, requireRole('admin') as any);

adminRouter.get('/members', async (c) => {
  const session = getSession(c as any);
  const chapterId = c.req.query('chapter_id');
  const house = c.req.query('house');
  const role = c.req.query('role');
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];
  if (chapterId) { conditions.push('chapter_id = ?'); params.push(chapterId); }
  if (house) { conditions.push('primary_house = ?'); params.push(house); }
  if (role) { conditions.push('role = ?'); params.push(role); }

  let queryStr: string;
  let bindParams: any[];
  const whereClause = conditions.join(' AND ');

  if (cursor) {
    queryStr = `SELECT id, email, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, chapter_id, role, is_active, email_verified, last_active_at, created_at FROM members WHERE ${whereClause} AND id > ? ORDER BY id ASC LIMIT ?`;
    bindParams = [...params, cursor, actualLimit];
  } else {
    queryStr = `SELECT id, email, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, chapter_id, role, is_active, email_verified, last_active_at, created_at FROM members WHERE ${whereClause} ORDER BY id ASC LIMIT ?`;
    bindParams = [...params, actualLimit];
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

adminRouter.patch('/members/:memberId', async (c) => {
  const session = getSession(c as any);
  const { memberId } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateMemberAdminSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as UpdateMemberAdminInput;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare(
    'SELECT role, is_active FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(memberId).first();

  if (!before) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.role !== undefined) { updates.push('role = ?'); params.push(input.role); }
  if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(memberId);

  await c.env.DB.prepare(
    `UPDATE members SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  const after = await c.env.DB.prepare(
    'SELECT role, is_active FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(memberId).first();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_member', 'member', memberId, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.post('/daily-content', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateDailyContentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreateDailyContentInput;
  const now = new Date().toISOString();
  const contentId = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO daily_content (id, house, content_type, title, body, media_r2_key, scheduled_date, day_of_week, is_published, authored_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)'
  ).bind(contentId, input.house, input.content_type, input.title, input.body, input.media_r2_key ?? null, input.scheduled_date ?? null, input.day_of_week ?? null, session.member_id, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_daily_content', 'daily_content', contentId, JSON.stringify(input), now).run();

  const content = await c.env.DB.prepare(
    'SELECT * FROM daily_content WHERE id = ?'
  ).bind(contentId).first();

  return c.json(content, 201);
});

adminRouter.get('/daily-content', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = 'SELECT * FROM daily_content WHERE deleted_at IS NULL AND id > ? ORDER BY id ASC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM daily_content WHERE deleted_at IS NULL ORDER BY id ASC LIMIT ?';
    bindParams = [actualLimit];
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

adminRouter.patch('/daily-content/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = CreateDailyContentSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as Partial<CreateDailyContentInput>;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare(
    'SELECT * FROM daily_content WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first();

  if (!before) {
    return c.json({ error: 'Content not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.house !== undefined) { updates.push('house = ?'); params.push(input.house); }
  if (input.content_type !== undefined) { updates.push('content_type = ?'); params.push(input.content_type); }
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.body !== undefined) { updates.push('body = ?'); params.push(input.body); }
  if (input.media_r2_key !== undefined) { updates.push('media_r2_key = ?'); params.push(input.media_r2_key); }
  if (input.scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(input.scheduled_date); }
  if (input.day_of_week !== undefined) { updates.push('day_of_week = ?'); params.push(input.day_of_week); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE daily_content SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  const after = await c.env.DB.prepare(
    'SELECT * FROM daily_content WHERE id = ?'
  ).bind(id).first();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_daily_content', 'daily_content', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.get('/cron-logs', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = 'SELECT * FROM cron_execution_logs WHERE id > ? ORDER BY id DESC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM cron_execution_logs ORDER BY id DESC LIMIT ?';
    bindParams = [actualLimit];
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

adminRouter.post('/chapters', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateChapterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreateChapterInput;
  const now = new Date().toISOString();
  const chapterId = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO chapters (id, slug, name, type, country_code, city, timezone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).bind(chapterId, input.slug, input.name, input.type, input.country_code ?? null, input.city ?? null, input.timezone, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_chapter', 'chapter', chapterId, JSON.stringify(input), now).run();

  const chapter = await c.env.DB.prepare(
    'SELECT * FROM chapters WHERE id = ?'
  ).bind(chapterId).first();

  return c.json(chapter, 201);
});
