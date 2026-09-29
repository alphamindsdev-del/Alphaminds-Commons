import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { DEFAULT_SETTINGS, parseSettings, mergeSettings } from '../../../shared/settings.js';
import { UpdateProfileSchema, UpdateProfileInput, UpdateHousesSchema, UpdateHousesInput } from '../lib/validation.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { uploadMedia } from '../lib/r2.js';
import { sendDataExportEmail } from '../lib/email.js';
import { authMiddleware, getSession, resolveSession } from '../middleware/auth.js';
import { mapChallenge } from '../lib/challenge-mapper.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const membersRouter = new Hono<{ Bindings: Env }>();

membersRouter.get('/profile', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, avatar_r2_key, cover_photo_r2_key, bio, country_code, city, primary_house, membership_level, chapter_id, role, is_active, email_verified, last_active_at, created_at, updated_at FROM members WHERE id = ? AND deleted_at IS NULL'
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
    'SELECT id, email, username, display_name, avatar_r2_key, cover_photo_r2_key, bio, country_code, city, primary_house, membership_level, chapter_id, role, is_active, email_verified, last_active_at, created_at, updated_at FROM members WHERE id = ? AND deleted_at IS NULL'
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

membersRouter.put('/cover', authMiddleware, async (c) => {
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
      'UPDATE members SET cover_photo_r2_key = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
    ).bind(result.r2_key, now, session.member_id).run();

    return c.json({ cover_photo_r2_key: result.r2_key, url: result.url });
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
     FROM challenge_participations cp
     JOIN challenges c ON cp.challenge_id = c.id
     WHERE cp.member_id = ? AND cp.status = 'active' AND c.deleted_at IS NULL
     ORDER BY cp.created_at DESC`
  ).bind(session.member_id).all();

  const completed = await c.env.DB.prepare(
    `SELECT cp.*, c.title, c.slug, c.description, c.challenge_type, c.metric_type, c.target_value, c.duration_days, c.points_reward, c.min_tier, c.starts_at, c.ends_at, c.house
     FROM challenge_participations cp
     JOIN challenges c ON cp.challenge_id = c.id
     WHERE cp.member_id = ? AND cp.status = 'completed' AND c.deleted_at IS NULL
     ORDER BY cp.completed_at DESC`
  ).bind(session.member_id).all();

  const activeMapped = active.results.map((r: any) => ({ ...mapChallenge(r), joined: true, current: r.current_value ?? 0 }));
  const completedMapped = completed.results.map((r: any) => ({ ...mapChallenge(r), joined: false, current: r.current_value ?? 0 }));
  return c.json({ active: activeMapped, completed: completedMapped });
});

membersRouter.get('/settings', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const row = await c.env.DB.prepare(
    'SELECT settings_json FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ settings_json: string | null }>();

  return c.json({ settings: { ...DEFAULT_SETTINGS, ...parseSettings(row?.settings_json) } });
});

membersRouter.put('/settings', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json().catch(() => null) as { settings?: unknown } | null;
  const incoming = body?.settings;

  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  const row = await c.env.DB.prepare(
    'SELECT settings_json FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ settings_json: string | null }>();

  const merged = mergeSettings(parseSettings(row?.settings_json), incoming as Record<string, unknown>);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE members SET settings_json = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(JSON.stringify(merged), now, session.member_id).run();

  return c.json({ settings: merged });
});

async function findMemberByHandle(env: Env, handle: string) {
  return env.DB.prepare(
    'SELECT id FROM members WHERE (id = ? OR username = ?) AND deleted_at IS NULL AND is_active = 1'
  ).bind(handle, handle).first<{ id: string }>();
}

async function followState(env: Env, memberId: string, viewerId: string | null) {
  const followeeCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM member_follows WHERE followee_id = ?'
  ).bind(memberId).first<{ count: number }>();
  const followingCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM member_follows WHERE follower_id = ?'
  ).bind(memberId).first<{ count: number }>();

  let isFollowing = false;
  if (viewerId && viewerId !== memberId) {
    const row = await env.DB.prepare(
      'SELECT 1 FROM member_follows WHERE follower_id = ? AND followee_id = ?'
    ).bind(viewerId, memberId).first();
    isFollowing = !!row;
  }

  return {
    is_following: isFollowing,
    follower_count: followeeCount?.count ?? 0,
    following_count: followingCount?.count ?? 0,
  };
}

membersRouter.post('/:memberId/follow', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { memberId } = c.req.param();

  const target = await findMemberByHandle(c.env, memberId);
  if (!target) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }
  if (target.id === session.member_id) {
    return c.json({ error: 'You cannot follow yourself', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO member_follows (id, follower_id, followee_id) VALUES (?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, target.id).run();

  return c.json({ following: true, ...(await followState(c.env, target.id, session.member_id)) });
});

membersRouter.delete('/:memberId/follow', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { memberId } = c.req.param();

  const target = await findMemberByHandle(c.env, memberId);
  if (!target) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM member_follows WHERE follower_id = ? AND followee_id = ?'
  ).bind(session.member_id, target.id).run();

  return c.json({ following: false, ...(await followState(c.env, target.id, session.member_id)) });
});

membersRouter.get('/:memberId/profile', async (c) => {
  const { memberId } = c.req.param();

  const member = await c.env.DB.prepare(
    `SELECT m.id, m.username, m.display_name, m.avatar_r2_key, m.cover_photo_r2_key, m.bio, m.country_code, m.city, m.primary_house, m.role, m.created_at, ch.name AS chapter
     FROM members m
     LEFT JOIN chapters ch ON m.chapter_id = ch.id
     WHERE (m.id = ? OR m.username = ?) AND m.deleted_at IS NULL AND m.is_active = 1`
  ).bind(memberId, memberId).first<{
    id: string;
    username: string;
    display_name: string;
    avatar_r2_key: string | null;
    cover_photo_r2_key: string | null;
    bio: string | null;
    primary_house: string;
    role: string;
    created_at: string;
    chapter: string | null;
  }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const stats = await c.env.DB.prepare(
    'SELECT total_score, total_points, impact_score, wellness_score, becoming_score, connection_score, play_score, humanity_score, challenges_completed, events_attended, current_streak_days FROM member_stats WHERE member_id = ?'
  ).bind(member.id).first<{
    wellness_score: number;
    becoming_score: number;
    connection_score: number;
    play_score: number;
    humanity_score: number;
    total_score: number;
    total_points: number;
    impact_score: number;
    challenges_completed: number;
    events_attended: number;
    current_streak_days: number;
  }>();

  const badges = await c.env.DB.prepare(
    'SELECT mb.*, b.slug, b.name, b.description, b.icon_r2_key, b.house FROM member_badges mb JOIN badges b ON mb.badge_id = b.id WHERE mb.member_id = ?'
  ).bind(member.id).all();

  const session = await resolveSession(c as any);
  const isSelf = session?.member_id === member.id;
  const follow = await followState(c.env, member.id, session?.member_id ?? null);

  return c.json({
    ...member,
    avatar_url: member.avatar_r2_key,
    cover_photo_url: member.cover_photo_r2_key,
    scores: {
      wellness: stats?.wellness_score ?? 0,
      becoming: stats?.becoming_score ?? 0,
      connection: stats?.connection_score ?? 0,
      fun: stats?.play_score ?? 0,
      humanity: stats?.humanity_score ?? 0,
    },
    stats,
    badges: badges.results,
    is_self: isSelf,
    ...follow,
  });
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
  const session = getSession(c as any);

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, bio, country_code, city, primary_house, chapter_id, role, email_verified, settings_json, last_active_at, created_at FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ email: string }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const owned = (table: string, column = 'member_id') =>
    c.env.DB.prepare(`SELECT * FROM ${table} WHERE ${column} = ?`).bind(session.member_id).all();

  const [stats, houses, badges, posts, comments, reactions, participations, rsvps, notifications, follows, planProgress, journeyProgress, codeSaves, pollVotes, detectorResults] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM member_stats WHERE member_id = ?').bind(session.member_id).all(),
    owned('member_house_selections'),
    owned('member_badges'),
    owned('posts', 'author_id'),
    owned('comments', 'author_id'),
    owned('reactions'),
    owned('challenge_participations'),
    owned('event_rsvps'),
    owned('notifications'),
    owned('member_follows', 'follower_id'),
    owned('plan_progress'),
    owned('member_journey_progress'),
    owned('saved_code_passages'),
    owned('poll_votes'),
    owned('detector_results'),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    profile: member,
    stats: stats.results,
    houses: houses.results,
    badges: badges.results,
    posts: posts.results,
    comments: comments.results,
    reactions: reactions.results,
    challenge_participations: participations.results,
    event_rsvps: rsvps.results,
    notifications: notifications.results,
    following: follows.results,
    plan_progress: planProgress.results,
    journey_progress: journeyProgress.results,
    saved_code_passages: codeSaves.results,
    poll_votes: pollVotes.results,
    detector_results: detectorResults.results,
  };

  try {
    await sendDataExportEmail(c.env, member.email, exportPayload);
  } catch (err) {
    console.error('Data export failed:', err);
    return c.json({ error: 'Could not send export email', code: ERROR_CODES.INTERNAL_ERROR }, 500);
  }

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
