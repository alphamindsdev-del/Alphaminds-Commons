import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { UpdateProfileSchema, UpdateProfileInput, UpdateHousesSchema, UpdateHousesInput } from '../lib/validation.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { uploadMedia } from '../lib/r2.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const membersRouter = new Hono<{ Bindings: Env }>();

membersRouter.get('/profile', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, chapter_id, role, is_active, email_verified, last_active_at, created_at, updated_at FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const stats = await c.env.DB.prepare(
    'SELECT * FROM member_stats WHERE member_id = ?'
  ).bind(session.member_id).first();

  const houses = await c.env.DB.prepare(
    'SELECT * FROM member_house_selections WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).all();

  const badges = await c.env.DB.prepare(
    'SELECT mb.*, b.slug, b.name, b.description, b.icon_r2_key, b.house FROM member_badges mb JOIN badges b ON mb.badge_id = b.id WHERE mb.member_id = ?'
  ).bind(session.member_id).all();

  return c.json({ member, stats, houses: houses.results, badges: badges.results });
});

membersRouter.patch('/profile', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as UpdateProfileInput;
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];
  if (input.display_name !== undefined) { updates.push('display_name = ?'); params.push(input.display_name); }
  if (input.bio !== undefined) { updates.push('bio = ?'); params.push(input.bio); }
  if (input.country_code !== undefined) { updates.push('country_code = ?'); params.push(input.country_code); }
  if (input.city !== undefined) { updates.push('city = ?'); params.push(input.city); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(session.member_id);

  await c.env.DB.prepare(
    `UPDATE members SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, chapter_id, role, is_active, email_verified, last_active_at, created_at, updated_at FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first();

  return c.json({ member });
});

membersRouter.put('/avatar', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | null;

  if (!file) {
    return c.json({ error: 'No file provided', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  try {
    const result = await uploadMedia(c.env, session.member_id, file);
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE members SET avatar_r2_key = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
    ).bind(result.r2_key, now, session.member_id).run();

    return c.json({ avatar_r2_key: result.r2_key, url: result.url });
  } catch (err: any) {
    if (err.message === 'Unsupported media type') {
      return c.json({ error: 'Unsupported media type', code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE }, 415);
    }
    if (err.message === 'File too large') {
      return c.json({ error: 'File too large', code: ERROR_CODES.FILE_TOO_LARGE }, 413);
    }
    return c.json({ error: 'Upload failed', code: ERROR_CODES.INTERNAL_ERROR }, 500);
  }
});

membersRouter.put('/houses', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = UpdateHousesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { primary_house, secondary_houses } = parsed.data as UpdateHousesInput;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE member_house_selections SET deleted_at = CURRENT_TIMESTAMP WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).run();

  const primaryId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO member_house_selections (id, member_id, house, is_primary, joined_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)'
  ).bind(primaryId, session.member_id, primary_house, now, now, now).run();

  for (const house of secondary_houses) {
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO member_house_selections (id, member_id, house, is_primary, joined_at, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)'
    ).bind(id, session.member_id, house, now, now, now).run();
  }

  await c.env.DB.prepare(
    'UPDATE members SET primary_house = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(primary_house, now, session.member_id).run();

  const houses = await c.env.DB.prepare(
    'SELECT * FROM member_house_selections WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).all();

  return c.json({ houses: houses.results });
});

membersRouter.get('/challenges', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const active = await c.env.DB.prepare(
    `SELECT cp.*, c.title, c.slug, c.description, c.challenge_type, c.metric_type, c.target_value, c.duration_days, c.points_reward, c.min_tier, c.starts_at, c.ends_at, c.house
     FROM challenge_participation cp
     JOIN challenges c ON cp.challenge_id = c.id
     WHERE cp.member_id = ? AND cp.deleted_at IS NULL AND cp.status = 'active' AND c.deleted_at IS NULL
     ORDER BY cp.created_at DESC`
  ).bind(session.member_id).all();

  const completed = await c.env.DB.prepare(
    `SELECT cp.*, c.title, c.slug, c.description, c.challenge_type, c.metric_type, c.target_value, c.duration_days, c.points_reward, c.min_tier, c.starts_at, c.ends_at, c.house
     FROM challenge_participation cp
     JOIN challenges c ON cp.challenge_id = c.id
     WHERE cp.member_id = ? AND cp.deleted_at IS NULL AND cp.status = 'completed' AND c.deleted_at IS NULL
     ORDER BY cp.completed_at DESC`
  ).bind(session.member_id).all();

  return c.json({ active: active.results, completed: completed.results });
});

membersRouter.get('/:memberId/profile', async (c) => {
  const { memberId } = c.req.param();

  const member = await c.env.DB.prepare(
    'SELECT id, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, role, created_at FROM members WHERE id = ? AND deleted_at IS NULL AND is_active = 1'
  ).bind(memberId).first();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const stats = await c.env.DB.prepare(
    'SELECT total_score, total_points, impact_score, challenges_completed, events_attended, current_streak_days FROM member_stats WHERE member_id = ?'
  ).bind(memberId).first();

  const badges = await c.env.DB.prepare(
    'SELECT mb.*, b.slug, b.name, b.description, b.icon_r2_key, b.house FROM member_badges mb JOIN badges b ON mb.badge_id = b.id WHERE mb.member_id = ?'
  ).bind(memberId).all();

  return c.json({ member, stats, badges: badges.results });
});

membersRouter.post('/notifications/read-all', authMiddleware, async (c) => {
  const session = getSession(c as any);

  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).run();

  return c.json({ success: true });
});

membersRouter.put('/push-token', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE members SET push_token = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(JSON.stringify(body), now, session.member_id).run();

  return c.json({ success: true });
});

membersRouter.get('/subscription', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const subscription = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE member_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
  ).bind(session.member_id).first();

  return c.json({ subscription });
});

membersRouter.get('/data-export', authMiddleware, async (c) => {
  return c.json({ message: 'Data export requested. You will receive an email when ready.' }, 202);
});

membersRouter.delete('/account', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();

  if (!body.password) {
    return c.json({ error: 'Password required', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  const member = await c.env.DB.prepare(
    'SELECT password_hash FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ password_hash: string | null }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  if (member.password_hash) {
    const valid = await verifyPassword(body.password, member.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid password', code: ERROR_CODES.INVALID_CREDENTIALS }, 401);
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE members SET deleted_at = CURRENT_TIMESTAMP, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(now, session.member_id).run();

  return c.json({ success: true });
});
