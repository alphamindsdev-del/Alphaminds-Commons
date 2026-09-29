import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { RsvpSchema } from '../lib/validation.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';
import { touchActivity } from '../lib/scoring.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };
type BindingsEnv = { Bindings: Env };

export const chapterEventsRouter = new Hono<BindingsEnv>();

chapterEventsRouter.get('/:chapterId/events', async (c) => {
  const { chapterId } = c.req.param();
  const house = c.req.query('house');
  const format = c.req.query('format');
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const conditions: string[] = ['deleted_at IS NULL', 'is_published = 1'];
  const params: any[] = [];

  if (chapterId !== 'global') {
    conditions.push('chapter_id = ?');
    params.push(chapterId);
  }
  if (house) { conditions.push('house = ?'); params.push(house); }
  if (format) { conditions.push('format = ?'); params.push(format); }

  let queryStr: string;
  let bindParams: any[];
  const whereClause = conditions.join(' AND ');

  if (cursor) {
    queryStr = `SELECT * FROM events WHERE ${whereClause} AND id > ? ORDER BY id ASC LIMIT ?`;
    bindParams = [...params, cursor, actualLimit];
  } else {
    queryStr = `SELECT * FROM events WHERE ${whereClause} ORDER BY starts_at ASC LIMIT ?`;
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

export const eventsRouter = new Hono<BindingsEnv>();

eventsRouter.get('/:eventId', async (c) => {
  const { eventId } = c.req.param();

  const event = await c.env.DB.prepare(
    'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL'
  ).bind(eventId).first();

  if (!event) {
    return c.json({ error: 'Event not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const authHeader = c.req.header('Authorization');
  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token) {
    const cookie = c.req.header('Cookie') || '';
    const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    token = match ? (match[1] ?? null) : null;
  }

  let session: SessionPayload | null = null;
  if (token) {
    session = await c.env.ALPHAMINDS_SESSIONS.get('session:' + token, 'json') as SessionPayload | null;
    if (session && new Date(session.expires_at) < new Date()) {
      session = null;
    }
  }

  const rsvps = await c.env.DB.prepare(
    `SELECT er.status, er.created_at as rsvped_at, m.id as member_id, m.username, m.display_name, m.avatar_r2_key
     FROM event_rsvps er
     JOIN members m ON er.member_id = m.id
     WHERE er.event_id = ?
     ORDER BY er.created_at ASC
     LIMIT 10`
  ).bind(eventId).all();

  let isRsvped: string | null = null;
  if (session) {
    const myRsvp = await c.env.DB.prepare(
      'SELECT status FROM event_rsvps WHERE event_id = ? AND member_id = ?'
    ).bind(eventId, session.member_id).first<{ status: string }>();
    isRsvped = myRsvp?.status ?? null;
  }

  return c.json({
    ...event as any,
    attendees: rsvps.results,
    is_rsvped: isRsvped,
  });
});

eventsRouter.post('/:eventId/rsvp', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { eventId } = c.req.param();
  const body = await c.req.json();
  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { status } = parsed.data as import('../lib/validation.js').RsvpInput;
  const now = new Date().toISOString();

  const event = await c.env.DB.prepare(
    'SELECT rsvp_limit, rsvp_count, created_by, title FROM events WHERE id = ? AND deleted_at IS NULL'
  ).bind(eventId).first<{ rsvp_limit: number | null; rsvp_count: number; created_by: string | null; title: string }>();

  if (!event) {
    return c.json({ error: 'Event not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  if (status === 'going' && event.rsvp_limit !== null && event.rsvp_count >= event.rsvp_limit) {
    return c.json({ error: 'Event is full', code: ERROR_CODES.EVENT_FULL }, 409);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id, status FROM event_rsvps WHERE event_id = ? AND member_id = ?'
  ).bind(eventId, session.member_id).first<{ id: string; status: string }>();

  const wasAlreadyGoing = existing?.status === 'going';
  if (existing) {
    await c.env.DB.prepare(
      'UPDATE event_rsvps SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO event_rsvps (id, event_id, member_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), eventId, session.member_id, status, now, now).run();
  }

  await c.env.DB.prepare(
    "UPDATE events SET rsvp_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ? AND status IN ('going', 'maybe')) WHERE id = ?"
  ).bind(eventId, eventId).run();

  if (status === 'going' && !wasAlreadyGoing) {
    await c.env.DB.prepare(
      'UPDATE member_stats SET connection_score = connection_score + 1, total_score = total_score + 1, events_attended = events_attended + 1, updated_at = ? WHERE member_id = ?'
    ).bind(now, session.member_id).run();

    await touchActivity(c.env, session.member_id, new Date(now));
  }

  if (event.created_by && event.created_by !== session.member_id) {
    const memberInfo = await c.env.DB.prepare(
      'SELECT display_name FROM members WHERE id = ?'
    ).bind(session.member_id).first<{ display_name: string }>();
    await createNotification(
      c.env, event.created_by, 'new_event',
      `${memberInfo?.display_name ?? 'Someone'} RSVP'd to "${event.title}"`,
      `Status: ${status}`,
      `/events/${eventId}`,
    );
  }

  return c.json({ success: true, status });
});
