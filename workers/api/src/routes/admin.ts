import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES, WEEKLY_HOUSE_THEME } from '../../../shared/constants.js';
import { CreateDailyContentSchema, CreateDailyContentInput, UpdateMemberAdminSchema, UpdateMemberAdminInput, CreateChapterSchema, CreateChapterInput, UpdateChapterSchema, UpdateChapterInput, CreatePlanSchema, CreatePlanInput, CreatePlanSectionSchema, CreatePlanSectionInput, CreatePlanItemSchema, CreatePlanItemInput, CreateJourneyActivitySchema, CreateJourneyActivityInput, UpdateJourneyActivitySchema, UpdateJourneyActivityInput, CreateCodeSchema, CreateCodeInput, UpdateCodeSchema, UpdateCodeInput, SaveCodeSchema } from '../lib/validation.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { deleteDailyContentCache } from '../lib/kv.js';
import { requireRole } from '../middleware/requireRole.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use('*', authMiddleware as any, requireRole('admin') as any);

function getDateInTimezone(tz: string): { dateStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { dateStr: formatter.format(now) };
}

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
  const now = new Date();
  const nowIso = now.toISOString();
  const contentId = crypto.randomUUID();

  const admin = await c.env.DB.prepare(
    'SELECT timezone FROM members WHERE id = ?'
  ).bind(session.member_id).first<{ timezone: string }>();
  const tz = admin?.timezone || 'UTC';

  const scheduledDate = input.scheduled_date ?? (input.day_of_week ? null : getDateInTimezone(tz).dateStr);
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const scheduledDayName = scheduledDate ? (dayNames[new Date(`${scheduledDate}T00:00:00Z`).getUTCDay()!] ?? undefined) : undefined;
  const dayName = (input.day_of_week ?? scheduledDayName ?? dayNames[now.getUTCDay()!]) ?? undefined;
  const house = input.house ?? (dayName ? (WEEKLY_HOUSE_THEME[dayName] ?? 'wellness') : 'wellness');

  await c.env.DB.prepare(
    'INSERT INTO daily_content (id, house, content_type, title, body, media_r2_key, scheduled_date, day_of_week, is_published, authored_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)'
  ).bind(contentId, house, input.content_type ?? 'insight', input.title, input.body, input.media_r2_key ?? null, scheduledDate, input.day_of_week ?? null, session.member_id, nowIso, nowIso).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_daily_content', 'daily_content', contentId, JSON.stringify(input), nowIso).run();

  if (scheduledDate) {
    await deleteDailyContentCache(c.env, scheduledDate);
  }

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

  const datesToInvalidate = new Set<string>();
  if ((before as any)?.scheduled_date) datesToInvalidate.add((before as any).scheduled_date);
  if (input.scheduled_date) datesToInvalidate.add(input.scheduled_date);
  await Promise.all([...datesToInvalidate].map(d => deleteDailyContentCache(c.env, d)));

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_daily_content', 'daily_content', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.delete('/daily-content/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();

  const existing = await c.env.DB.prepare(
    'SELECT * FROM daily_content WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ id: string; scheduled_date: string | null }>();
  if (!existing) {
    return c.json({ error: 'Content not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE daily_content SET deleted_at = ?, updated_at = ? WHERE id = ?'
  ).bind(now, now, id).run();

  if (existing.scheduled_date) {
    await deleteDailyContentCache(c.env, existing.scheduled_date);
  }

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_daily_content', 'daily_content', id, JSON.stringify({ deleted_at: now }), now).run();

  return c.json({ success: true });
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

adminRouter.get('/chapters', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM chapters WHERE deleted_at IS NULL AND id > ? ORDER BY id ASC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM chapters WHERE deleted_at IS NULL ORDER BY id ASC LIMIT ?';
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

adminRouter.get('/events', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM events WHERE deleted_at IS NULL AND id > ? ORDER BY created_at DESC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?';
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

adminRouter.post('/events', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const { title, slug, description, house, event_type, format, starts_at, ends_at, chapter_id, location_name, location_address, online_url, registration_url, rsvp_limit, cover_r2_key } = body;
  if (!title || !slug || !starts_at || !ends_at) {
    return c.json({ error: 'title, slug, starts_at, ends_at are required', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }
  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO events (id, chapter_id, house, title, slug, description, event_type, format, location_name, location_address, online_url, registration_url, starts_at, ends_at, rsvp_limit, cover_r2_key, is_published, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).bind(eventId, chapter_id ?? null, house ?? null, title, slug, description ?? null, event_type ?? 'other', format ?? 'physical', location_name ?? null, location_address ?? null, online_url ?? null, registration_url ?? null, starts_at, ends_at, rsvp_limit ?? null, cover_r2_key ?? null, session.member_id, now, now).run();

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
  return c.json(event, 201);
});

adminRouter.patch('/events/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const before = await c.env.DB.prepare('SELECT * FROM events WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Event not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  const updates: string[] = []; const params: any[] = [];
  for (const field of ['title','slug','description','house','event_type','format','location_name','location_address','online_url','registration_url','starts_at','ends_at','rsvp_limit','chapter_id','cover_r2_key']) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); params.push(body[field]); }
  }
  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }
  updates.push('updated_at = ?'); params.push(now, id);
  await c.env.DB.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();
  const after = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  await c.env.DB.prepare('INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), session.member_id, 'update_event', 'event', id, JSON.stringify(before), JSON.stringify(after), now).run();
  return c.json({ success: true, before, after });
});

adminRouter.delete('/events/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) { return c.json({ error: 'Event not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare('INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), session.member_id, 'delete_event', 'event', id, JSON.stringify({ deleted_at: now }), now).run();
  return c.json({ success: true });
});

adminRouter.get('/events/:id/registrations', async (c) => {
  const { id } = c.req.param();
  const event = await c.env.DB.prepare('SELECT id, title FROM events WHERE id = ? AND deleted_at IS NULL').bind(id).first<{ id: string; title: string }>();
  if (!event) { return c.json({ error: 'Event not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const registrations = await c.env.DB.prepare(
    `SELECT er.id, er.status, er.created_at as rsvped_at, m.id as member_id, m.username, m.display_name, m.avatar_r2_key, m.email
     FROM event_rsvps er
     JOIN members m ON er.member_id = m.id
     WHERE er.event_id = ?
     ORDER BY er.created_at ASC`
  ).bind(id).all();
  return c.json({ data: registrations.results });
});

adminRouter.get('/rooms', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM rooms WHERE deleted_at IS NULL AND id > ? ORDER BY created_at DESC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM rooms WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?';
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

adminRouter.post('/rooms', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const { name, slug, description, house, chapter_id, is_private } = body;
  if (!name || !slug || !house) {
    return c.json({ error: 'name, slug, house are required', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }
  const now = new Date().toISOString();
  const roomId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO rooms (id, chapter_id, house, name, slug, description, is_private, is_active, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).bind(roomId, chapter_id ?? null, house, name, slug, description ?? null, is_private ? 1 : 0, session.member_id, now, now).run();

  const room = await c.env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first();
  return c.json(room, 201);
});

adminRouter.patch('/rooms/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const before = await c.env.DB.prepare('SELECT * FROM rooms WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Room not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  const updates: string[] = []; const params: any[] = [];
  for (const field of ['name','slug','description','house','chapter_id']) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); params.push(body[field]); }
  }
  if (body.is_private !== undefined) { updates.push('is_private = ?'); params.push(body.is_private ? 1 : 0); }
  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }
  updates.push('updated_at = ?'); params.push(now, id);
  await c.env.DB.prepare(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();
  const after = await c.env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();
  await c.env.DB.prepare('INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), session.member_id, 'update_room', 'room', id, JSON.stringify(before), JSON.stringify(after), now).run();
  return c.json({ success: true, before, after });
});

adminRouter.delete('/rooms/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) { return c.json({ error: 'Room not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE rooms SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare('INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), session.member_id, 'delete_room', 'room', id, JSON.stringify({ deleted_at: now }), now).run();
  return c.json({ success: true });
});

adminRouter.get('/stats', async (c) => {
  const totalResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL'
  ).first<{ count: number }>();
  const activeTodayResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL AND last_active_at >= datetime('now', '-1 day')"
  ).first<{ count: number }>();
  const eventsResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL AND starts_at >= datetime('now')"
  ).first<{ count: number }>();
  const contentTodayResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM daily_content WHERE is_published = 1 AND scheduled_date = date('now')"
  ).first<{ count: number }>();

  return c.json({
    total_members: totalResult?.count ?? 0,
    active_today: activeTodayResult?.count ?? 0,
    upcoming_events: eventsResult?.count ?? 0,
    content_published_today: contentTodayResult?.count ?? 0,
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

adminRouter.patch('/chapters/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateChapterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as UpdateChapterInput;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Chapter not found', code: ERROR_CODES.NOT_FOUND }, 404); }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.slug !== undefined) { updates.push('slug = ?'); params.push(input.slug); }
  if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
  if (input.type !== undefined) { updates.push('type = ?'); params.push(input.type); }
  if (input.country_code !== undefined) { updates.push('country_code = ?'); params.push(input.country_code); }
  if (input.city !== undefined) { updates.push('city = ?'); params.push(input.city); }
  if (input.timezone !== undefined) { updates.push('timezone = ?'); params.push(input.timezone); }
  if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }

  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }
  updates.push('updated_at = ?');
  params.push(now, id);
  await c.env.DB.prepare(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();

  const after = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(id).first();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_chapter', 'chapter', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.delete('/chapters/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) { return c.json({ error: 'Chapter not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE chapters SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_chapter', 'chapter', id, JSON.stringify(existing), now).run();
  return c.json({ success: true });
});

adminRouter.get('/library', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const actualLimit = limit + 1;
  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM library_articles WHERE deleted_at IS NULL AND id > ? ORDER BY created_at DESC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM library_articles WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?';
    bindParams = [actualLimit];
  }
  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];
  return c.json({
    data,
    pagination: { next_cursor: hasMore && lastItem ? (lastItem as any).id : null, has_more: hasMore, limit },
  });
});

adminRouter.post('/library', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const { house, title, slug, excerpt, body: articleBody, cover_r2_key, author_name, read_time_min } = body;
  if (!house || !title || !slug || !articleBody) {
    return c.json({ error: 'house, title, slug, body are required', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }
  const now = new Date().toISOString();
  const articleId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO library_articles (id, house, title, slug, excerpt, body, cover_r2_key, author_name, read_time_min, is_published, authored_by, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(articleId, house, title, slug, excerpt ?? null, articleBody, cover_r2_key ?? null, author_name ?? 'AlphaMinds Guides', read_time_min ?? 5, session.member_id, now, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_library_article', 'library_article', articleId, JSON.stringify(body), now).run();

  const article = await c.env.DB.prepare('SELECT * FROM library_articles WHERE id = ?').bind(articleId).first();
  return c.json(article, 201);
});

adminRouter.patch('/library/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const before = await c.env.DB.prepare('SELECT * FROM library_articles WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Article not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  const updates: string[] = []; const params: any[] = [];
  for (const field of ['house','title','slug','excerpt','body','cover_r2_key','author_name','read_time_min','is_published']) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); params.push(body[field]); }
  }
  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }
  updates.push('updated_at = ?'); params.push(now, id);
  await c.env.DB.prepare(`UPDATE library_articles SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();
  const after = await c.env.DB.prepare('SELECT * FROM library_articles WHERE id = ?').bind(id).first();
  await c.env.DB.prepare('INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), session.member_id, 'update_library_article', 'library_article', id, JSON.stringify(before), JSON.stringify(after), now).run();
  return c.json({ success: true, before, after });
});

adminRouter.delete('/library/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();

  const existing = await c.env.DB.prepare('SELECT id FROM library_articles WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) {
    return c.json({ error: 'Article not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE library_articles SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_library_article', 'library_article', id, JSON.stringify({ deleted_at: now }), now).run();

  return c.json({ success: true });
});

// ─── Plans CRUD ──────────────────────────────────────────────

adminRouter.get('/plans', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;
  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM plans WHERE deleted_at IS NULL AND id > ? ORDER BY created_at DESC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM plans WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?';
    bindParams = [actualLimit];
  }
  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  return c.json({ data, pagination: { has_more: hasMore, next_cursor: hasMore && data.length ? (data[data.length - 1] as any).id : null, limit } });
});

adminRouter.get('/plans/:id', async (c) => {
  const { id } = c.req.param();
  const plan = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!plan) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);
  const sections = await c.env.DB.prepare('SELECT * FROM plan_sections WHERE plan_id = ? ORDER BY sort_order ASC').bind(id).all();
  const items = await c.env.DB.prepare('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order ASC').bind(id).all();
  return c.json({ ...(plan as any), sections: sections.results, items: items.results });
});

adminRouter.post('/plans', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreatePlanSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as CreatePlanInput;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO plans (id, title, slug, description, cover_image_r2_key, difficulty, estimated_duration, is_published, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.title, input.slug, input.description, input.cover_image_r2_key ?? null, input.difficulty, input.estimated_duration ?? null, input.is_published ? 1 : 0, session.member_id, now, now).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_plan', 'plan', id, JSON.stringify(input), now).run();
  const plan = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(id).first();
  return c.json(plan, 201);
});

adminRouter.patch('/plans/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = CreatePlanSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as Partial<CreatePlanInput>;
  const now = new Date().toISOString();
  const before = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);
  const updates: string[] = [];
  const params: any[] = [];
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.slug !== undefined) { updates.push('slug = ?'); params.push(input.slug); }
  if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
  if (input.cover_image_r2_key !== undefined) { updates.push('cover_image_r2_key = ?'); params.push(input.cover_image_r2_key); }
  if (input.difficulty !== undefined) { updates.push('difficulty = ?'); params.push(input.difficulty); }
  if (input.estimated_duration !== undefined) { updates.push('estimated_duration = ?'); params.push(input.estimated_duration); }
  if (input.is_published !== undefined) { updates.push('is_published = ?'); params.push(input.is_published ? 1 : 0); }
  if (updates.length === 0) return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);
  await c.env.DB.prepare(`UPDATE plans SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_plan', 'plan', id, JSON.stringify(before), JSON.stringify(input), now).run();
  const after = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(id).first();
  return c.json(after);
});

adminRouter.delete('/plans/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const now = new Date().toISOString();
  const before = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);
  await c.env.DB.prepare('UPDATE plans SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_plan', 'plan', id, JSON.stringify({ deleted_at: now }), now).run();
  return c.json({ success: true });
});

// ─── Plan Sections CRUD ──────────────────────────────────────

adminRouter.get('/plans/:planId/sections', async (c) => {
  const { planId } = c.req.param();
  const result = await c.env.DB.prepare('SELECT * FROM plan_sections WHERE plan_id = ? ORDER BY sort_order ASC').bind(planId).all();
  return c.json(result.results);
});

adminRouter.post('/plans/:planId/sections', async (c) => {
  const body = await c.req.json();
  const parsed = CreatePlanSectionSchema.safeParse({ ...body, plan_id: c.req.param('planId') });
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as CreatePlanSectionInput;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO plan_sections (id, plan_id, title, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.plan_id, input.title, input.description, input.sort_order, now, now).run();
  const section = await c.env.DB.prepare('SELECT * FROM plan_sections WHERE id = ?').bind(id).first();
  return c.json(section, 201);
});

adminRouter.patch('/plans/:planId/sections/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = CreatePlanSectionSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as Partial<CreatePlanSectionInput>;
  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: any[] = [];
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
  if (input.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(input.sort_order); }
  if (updates.length === 0) return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);
  await c.env.DB.prepare(`UPDATE plan_sections SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  const after = await c.env.DB.prepare('SELECT * FROM plan_sections WHERE id = ?').bind(id).first();
  return c.json(after);
});

adminRouter.delete('/plans/:planId/sections/:id', async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM plan_sections WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ─── Plan Items CRUD ─────────────────────────────────────────

adminRouter.get('/plans/:planId/items', async (c) => {
  const { planId } = c.req.param();
  const result = await c.env.DB.prepare('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order ASC').bind(planId).all();
  return c.json(result.results);
});

adminRouter.post('/plans/:planId/items', async (c) => {
  const body = await c.req.json();
  const parsed = CreatePlanItemSchema.safeParse({ ...body, plan_id: c.req.param('planId') });
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as CreatePlanItemInput;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO plan_items (id, plan_id, section_id, title, body, content_type, media_r2_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.plan_id, input.section_id ?? null, input.title, input.body, input.content_type, input.media_r2_key ?? null, input.sort_order, now, now).run();
  const item = await c.env.DB.prepare('SELECT * FROM plan_items WHERE id = ?').bind(id).first();
  return c.json(item, 201);
});

adminRouter.patch('/plans/:planId/items/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = CreatePlanItemSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  const input = parsed.data as Partial<CreatePlanItemInput>;
  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: any[] = [];
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.body !== undefined) { updates.push('body = ?'); params.push(input.body); }
  if (input.content_type !== undefined) { updates.push('content_type = ?'); params.push(input.content_type); }
  if (input.media_r2_key !== undefined) { updates.push('media_r2_key = ?'); params.push(input.media_r2_key); }
  if (input.section_id !== undefined) { updates.push('section_id = ?'); params.push(input.section_id); }
  if (input.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(input.sort_order); }
  if (updates.length === 0) return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);
  await c.env.DB.prepare(`UPDATE plan_items SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  const after = await c.env.DB.prepare('SELECT * FROM plan_items WHERE id = ?').bind(id).first();
  return c.json(after);
});

adminRouter.delete('/plans/:planId/items/:id', async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM plan_items WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ─── Journey Activities CRUD ─────────────────────────────────────

adminRouter.get('/journey-activities', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;
  let queryStr: string;
  let bindParams: any[];
  if (cursor) {
    queryStr = 'SELECT * FROM journey_activities WHERE deleted_at IS NULL AND id > ? ORDER BY position ASC LIMIT ?';
    bindParams = [cursor, actualLimit];
  } else {
    queryStr = 'SELECT * FROM journey_activities WHERE deleted_at IS NULL ORDER BY position ASC LIMIT ?';
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

adminRouter.post('/journey-activities', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateJourneyActivitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreateJourneyActivityInput;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO journey_activities (id, level, title, description, type, instructions, position, is_required, is_published, content, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.level, input.title, input.description ?? null, input.type, input.instructions ?? null, input.position, input.is_required === false ? 0 : 1, input.is_published === true ? 1 : 0, input.content ?? null, input.metadata_json ?? null, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_journey_activity', 'journey_activity', id, JSON.stringify(input), now).run();

  const activity = await c.env.DB.prepare('SELECT * FROM journey_activities WHERE id = ?').bind(id).first();
  return c.json(activity, 201);
});

adminRouter.patch('/journey-activities/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateJourneyActivitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as UpdateJourneyActivityInput;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare('SELECT * FROM journey_activities WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Journey activity not found', code: ERROR_CODES.NOT_FOUND }, 404); }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.level !== undefined) { updates.push('level = ?'); params.push(input.level); }
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
  if (input.type !== undefined) { updates.push('type = ?'); params.push(input.type); }
  if (input.instructions !== undefined) { updates.push('instructions = ?'); params.push(input.instructions); }
  if (input.position !== undefined) { updates.push('position = ?'); params.push(input.position); }
  if (input.is_required !== undefined) { updates.push('is_required = ?'); params.push(input.is_required ? 1 : 0); }
  if (input.is_published !== undefined) { updates.push('is_published = ?'); params.push(input.is_published ? 1 : 0); }
  if (input.content !== undefined) { updates.push('content = ?'); params.push(input.content); }
  if (input.metadata_json !== undefined) { updates.push('metadata_json = ?'); params.push(input.metadata_json); }

  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }

  updates.push('updated_at = ?');
  params.push(now, id);

  await c.env.DB.prepare(
    `UPDATE journey_activities SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  const after = await c.env.DB.prepare('SELECT * FROM journey_activities WHERE id = ?').bind(id).first();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_journey_activity', 'journey_activity', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.delete('/journey-activities/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT id FROM journey_activities WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) { return c.json({ error: 'Journey activity not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE journey_activities SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_journey_activity', 'journey_activity', id, JSON.stringify({ deleted_at: now }), now).run();
  return c.json({ success: true });
});

// ─── The Code CRUD ───────────────────────────────────────────────

adminRouter.post('/the-code', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreateCodeInput;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO the_code (id, title, passage, scheduled_date, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.title, input.passage, input.scheduled_date ?? null, input.is_published === false ? 0 : 1, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_the_code', 'the_code', id, JSON.stringify(input), now).run();

  const code = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ?').bind(id).first();
  return c.json(code, 201);
});

adminRouter.patch('/the-code/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as UpdateCodeInput;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) { return c.json({ error: 'Code passage not found', code: ERROR_CODES.NOT_FOUND }, 404); }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.passage !== undefined) { updates.push('passage = ?'); params.push(input.passage); }
  if (input.scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(input.scheduled_date); }
  if (input.is_published !== undefined) { updates.push('is_published = ?'); params.push(input.is_published ? 1 : 0); }

  if (updates.length === 0) { return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400); }

  updates.push('updated_at = ?');
  params.push(now, id);

  await c.env.DB.prepare(
    `UPDATE the_code SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  const after = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ?').bind(id).first();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_the_code', 'the_code', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.delete('/the-code/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT id FROM the_code WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) { return c.json({ error: 'Code passage not found', code: ERROR_CODES.NOT_FOUND }, 404); }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE the_code SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_the_code', 'the_code', id, JSON.stringify({ deleted_at: now }), now).run();
  return c.json({ success: true });
});

// ─── Save Code Passages ─────────────────────────────────────────

adminRouter.post('/code/:id/save', async (c) => {
  const session = getSession(c as any);
  const { id: codeId } = c.req.param();
  const parsed = SaveCodeSchema.safeParse({ member_id: session.member_id, code_id: codeId });
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as { member_id: string; code_id: string };
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT * FROM saved_code_passages WHERE member_id = ? AND code_id = ?'
  ).bind(input.member_id, input.code_id).first();
  if (existing) {
    return c.json({ error: 'Code already saved', code: ERROR_CODES.VALIDATION_ERROR }, 409);
  }

  await c.env.DB.prepare(
    'INSERT INTO saved_code_passages (id, member_id, code_id, created_at) VALUES (?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), input.member_id, input.code_id, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'save_code', 'saved_code_passages', crypto.randomUUID(), JSON.stringify(input), now).run();

  return c.json({ success: true });
});

adminRouter.delete('/code/:id/unsave', async (c) => {
  const session = getSession(c as any);
  const { id: codeId } = c.req.param();
  await c.env.DB.prepare(
    'DELETE FROM saved_code_passages WHERE member_id = ? AND code_id = ?'
  ).bind(session.member_id, codeId).run();
  return c.json({ success: true });
});

// ─── Member Journey Progress ─────────────────────────────────────

adminRouter.get('/members/:memberId/journey-progress', async (c) => {
  const { memberId } = c.req.param();
  const progress = await c.env.DB.prepare(
    `SELECT m.*, a.position AS activity_position, a.title AS activity_title
     FROM member_journey_progress m
     JOIN journey_activities a ON a.id = m.activity_id
     WHERE m.member_id = ?
     ORDER BY a.position ASC, m.created_at DESC`
  ).bind(memberId).all();
  return c.json({ data: progress.results });
});

adminRouter.patch('/members/:memberId/journey-progress/:activityId/complete', async (c) => {
  const { memberId, activityId } = c.req.param();
  const session = getSession(c as any);
  const now = new Date().toISOString();

  // Check if activity exists
  const activity = await c.env.DB.prepare('SELECT * FROM journey_activities WHERE id = ? AND deleted_at IS NULL').bind(activityId).first();
  if (!activity) { return c.json({ error: 'Activity not found', code: ERROR_CODES.NOT_FOUND }, 404); }

  // Check if member has completed this activity already
  const existingProgress = await c.env.DB.prepare(
    'SELECT * FROM member_journey_progress WHERE member_id = ? AND activity_id = ?'
  ).bind(memberId, activityId).first();

  if (existingProgress) {
    // Update existing progress
    await c.env.DB.prepare(
      'UPDATE member_journey_progress SET status = ?, completed_at = ?, updated_at = ? WHERE member_id = ? AND activity_id = ?'
    ).bind('completed', now, now, memberId, activityId).run();
  } else {
    // Create new progress record
    await c.env.DB.prepare(
      'INSERT INTO member_journey_progress (id, member_id, activity_id, status, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), memberId, activityId, 'completed', now, now, now).run();
  }

  // Check if all required activities for current level are complete
  const member = await c.env.DB.prepare('SELECT membership_level FROM members WHERE id = ? AND deleted_at IS NULL').bind(memberId).first<{ membership_level: string }>();
  if (!member) { return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404); }

  const currentLevel = member.membership_level;
  const allActivities = await c.env.DB.prepare(
    `SELECT * FROM journey_activities WHERE level = ? AND is_required = 1 AND is_published = 1 AND deleted_at IS NULL ORDER BY position ASC`
  ).bind(currentLevel).all();

  if (allActivities.results.length > 0) {
    const activityIds = allActivities.results.map((a: any) => a.id);
    const placeholders = activityIds.map(() => '?').join(', ');
    const completedCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM member_journey_progress WHERE member_id = ? AND activity_id IN (${placeholders}) AND status = 'completed'`
    ).bind(memberId, ...activityIds).first<{ count: number }>();

    if ((completedCount?.count ?? 0) >= allActivities.results.length) {
      // Auto-promote to next level
      const levels: string[] = ['SEEKER', 'EXAMINER', 'FACILITATOR', 'STEWARD', 'CHAPTER_LEADER', 'COORDINATOR'];
      const currentIndex = levels.indexOf(currentLevel);
      if (currentIndex >= 0 && currentIndex < levels.length - 1) {
        const nextLevel = levels[currentIndex + 1];
        await c.env.DB.prepare(
          'UPDATE members SET membership_level = ?, updated_at = ? WHERE id = ?'
        ).bind(nextLevel, now, memberId).run();

        await c.env.DB.prepare(
          'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), session.member_id, 'promote_member', 'member', memberId, JSON.stringify({ from: currentLevel, to: nextLevel }), now).run();
      }
    }
  }

  return c.json({ success: true });
});

// Helper function to get next activity
function getNextActivityPosition(currentPosition: number, activities: any[]): number | null {
  const next = activities.find(a => a.position > currentPosition);
  return next ? next.position : null;
}

// ── The Code (daily passage) management ──────────────────────────────────
adminRouter.post('/code', async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreateCodeInput;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO the_code (id, title, passage, scheduled_date, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, input.title, input.passage, input.scheduled_date ?? null, input.is_published === false ? 0 : 1, now, now).run();

  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'create_code', 'the_code', id, JSON.stringify(input), now).run();

  const row = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ?').bind(id).first();
  return c.json(row, 201);
});

adminRouter.get('/code', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM the_code WHERE deleted_at IS NULL ORDER BY scheduled_date DESC, created_at DESC'
  ).all();
  return c.json({ data: result.results });
});

adminRouter.patch('/code/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateCodeSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as Partial<UpdateCodeInput>;
  const now = new Date().toISOString();

  const before = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!before) {
    return c.json({ error: 'Code not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
  if (input.passage !== undefined) { updates.push('passage = ?'); params.push(input.passage); }
  if (input.scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(input.scheduled_date); }
  if (input.is_published !== undefined) { updates.push('is_published = ?'); params.push(input.is_published ? 1 : 0); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }
  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(`UPDATE the_code SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run();

  const after = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ?').bind(id).first();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'update_code', 'the_code', id, JSON.stringify(before), JSON.stringify(after), now).run();

  return c.json({ success: true, before, after });
});

adminRouter.delete('/code/:id', async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const existing = await c.env.DB.prepare('SELECT * FROM the_code WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) {
    return c.json({ error: 'Code not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE the_code SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  await c.env.DB.prepare(
    'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, before_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, 'delete_code', 'the_code', id, JSON.stringify(existing), now).run();
  return c.json({ success: true });
});

