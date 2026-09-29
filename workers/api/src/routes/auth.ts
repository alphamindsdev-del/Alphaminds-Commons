import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { RegisterSchema, RegisterInput, LoginSchema, LoginInput, ForgotPasswordSchema, ForgotPasswordInput, VerifyOtpSchema, VerifyOtpInput, ResetPasswordSchema, ResetPasswordInput } from '../lib/validation.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateSessionToken, createSessionPayload, storeSession, deleteSession } from '../lib/session.js';
import { isEmailTaken, isUsernameTaken } from '../lib/db.js';
import { sendOtpEmail } from '../lib/email.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { signHandoff } from '../lib/handoff.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as RegisterInput;

  if (await isEmailTaken(c.env.DB, input.email)) {
    return c.json({ error: 'Email already registered', code: ERROR_CODES.EMAIL_TAKEN }, 409);
  }
  if (await isUsernameTaken(c.env.DB, input.username)) {
    return c.json({ error: 'Username already taken', code: ERROR_CODES.USERNAME_TAKEN }, 409);
  }

  const passwordHash = await hashPassword(input.password);
  const memberId = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO members (id, email, username, display_name, password_hash, country_code, age, gender, primary_house, chapter_id, timezone, role, is_active, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'member\', 1, 1, ?, ?)'
  ).bind(memberId, input.email, input.username, input.display_name, passwordHash, input.country_code ?? null, input.age ?? null, input.gender ?? null, input.primary_house, input.chapter_id ?? null, input.timezone, now, now).run();

  const statsId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO member_stats (id, member_id, becoming_score, connection_score, wellness_score, play_score, humanity_score, total_score, impact_score, current_streak_days, longest_streak_days, total_points, volunteer_hours, challenges_completed, events_attended, posts_authored, rooms_joined, detectors_completed, created_at, updated_at) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?)'
  ).bind(statsId, memberId, now, now).run();

  const primaryHouseId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO member_house_selections (id, member_id, house, is_primary, joined_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)'
  ).bind(primaryHouseId, memberId, input.primary_house, now, now, now).run();

  for (const house of input.secondary_houses) {
    const houseId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO member_house_selections (id, member_id, house, is_primary, joined_at, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)'
    ).bind(houseId, memberId, house, now, now, now).run();
  }

  await c.env.DB.prepare(
    'INSERT INTO subscriptions (id, member_id, tier, status, grace_period_days, created_at, updated_at) VALUES (?, ?, \'free\', \'active\', 0, ?, ?)'
  ).bind(crypto.randomUUID(), memberId, now, now).run();

  if (input.chapter_id) {
    await c.env.DB.prepare(
      'INSERT INTO member_chapter_history (id, member_id, to_chapter_id, reason, created_at) VALUES (?, ?, ?, \'registration\', ?)'
    ).bind(crypto.randomUUID(), memberId, input.chapter_id, now).run();
  }

  const token = generateSessionToken();
  const session = createSessionPayload({
    member_id: memberId,
    email: input.email,
    username: input.username,
    role: 'member',
    chapter_id: input.chapter_id ?? null,
    subscription_tier: 'free',
  } as any);
  await storeSession(c.env, token, session);

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, avatar_r2_key, bio, country_code, city, primary_house, membership_level, chapter_id, role, is_active, email_verified, created_at FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(memberId).first();

  return c.json({ token, member }, 201);
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { email, password } = parsed.data as LoginInput;

  const member = await c.env.DB.prepare(
    'SELECT * FROM members WHERE email = ? AND deleted_at IS NULL'
  ).bind(email).first<any>();
  if (!member) {
    return c.json({ error: 'Invalid email or password', code: ERROR_CODES.INVALID_CREDENTIALS }, 401);
  }
  if (!member.password_hash) {
    return c.json({ error: 'Account uses social login', code: ERROR_CODES.INVALID_CREDENTIALS }, 401);
  }
  const valid = await verifyPassword(password, member.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password', code: ERROR_CODES.INVALID_CREDENTIALS }, 401);
  }
  if (!member.is_active) {
    return c.json({ error: 'Account suspended', code: ERROR_CODES.ACCOUNT_SUSPENDED }, 403);
  }

  const token = generateSessionToken();

  const sub = await c.env.DB.prepare(
    'SELECT tier FROM subscriptions WHERE member_id = ? AND status = \'active\' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
  ).bind(member.id).first<{ tier: string }>();

  const session = createSessionPayload({
    member_id: member.id,
    email: member.email,
    username: member.username,
    role: member.role,
    chapter_id: member.chapter_id,
    subscription_tier: sub?.tier ?? 'free',
  });
  await storeSession(c.env, token, session);

  await c.env.DB.prepare(
    'UPDATE members SET last_active_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), member.id).run();

  const { password_hash, session_revoked_at, ...safeMember } = member;

  return c.json({ token, member: safeMember });
});

authRouter.post('/logout', authMiddleware, async (c) => {
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
  if (token) {
    await deleteSession(c.env, token);
  }
  return c.json({ success: true });
});

authRouter.get('/me', authMiddleware, async (c) => {
  const session = getSession(c);

  const member = await c.env.DB.prepare(
    'SELECT id, email, username, display_name, avatar_r2_key, cover_photo_r2_key, bio, country_code, city, primary_house, membership_level, chapter_id, timezone, role, is_active, email_verified, last_active_at, created_at, updated_at FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const houses = await c.env.DB.prepare(
    'SELECT house, is_primary FROM member_house_selections WHERE member_id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).all();

  return c.json({ member, secondary_houses: houses.results.filter((h: any) => !h.is_primary).map((h: any) => h.house) });
});

authRouter.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { email } = parsed.data as ForgotPasswordInput;

  const member = await c.env.DB.prepare(
    'SELECT id FROM members WHERE email = ? AND deleted_at IS NULL'
  ).bind(email).first<{ id: string }>();

  if (member) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await c.env.ALPHAMINDS_SESSIONS.put(`otp:${email}`, otp, { expirationTtl: 600 });
    try {
      await sendOtpEmail(c.env, email, otp);
    } catch (err) {
      console.error('Failed to send OTP email:', err);
    }
  }

  return c.json({ success: true });
});

authRouter.post('/verify-otp', async (c) => {
  const body = await c.req.json();
  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { email, otp } = parsed.data as VerifyOtpInput;

  const storedOtp = await c.env.ALPHAMINDS_SESSIONS.get(`otp:${email}`);
  if (!storedOtp) {
    return c.json({ error: 'OTP expired', code: ERROR_CODES.OTP_EXPIRED }, 400);
  }
  if (storedOtp !== otp) {
    return c.json({ error: 'Invalid OTP', code: ERROR_CODES.INVALID_OTP }, 400);
  }

  await c.env.ALPHAMINDS_SESSIONS.delete(`otp:${email}`);

  const resetToken = crypto.randomUUID();
  await c.env.ALPHAMINDS_SESSIONS.put(`reset:${resetToken}`, email, { expirationTtl: 900 });

  return c.json({ reset_token: resetToken });
});

authRouter.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { reset_token, new_password } = parsed.data as ResetPasswordInput;

  const email = await c.env.ALPHAMINDS_SESSIONS.get(`reset:${reset_token}`);
  if (!email) {
    return c.json({ error: 'Invalid or expired reset token', code: ERROR_CODES.INVALID_OTP }, 400);
  }

  await c.env.ALPHAMINDS_SESSIONS.delete(`reset:${reset_token}`);

  const passwordHash = await hashPassword(new_password);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE members SET password_hash = ?, session_revoked_at = ?, updated_at = ? WHERE email = ? AND deleted_at IS NULL'
  ).bind(passwordHash, now, now, email).run();

  return c.json({ success: true });
});

// Embedded Rel-Fi single sign-on: issues a short-lived, signed handoff JWT the
// Rel-Fi worker can verify locally (shared RELFI_SERVICE_SECRET) to provision a
// Rel-Fi user from the AlphaMinds session — no session cookie exposure, no
// cross-worker call. Called same-origin from the embedded game frontend.
authRouter.get('/relfi-handoff', authMiddleware, async (c) => {
  const session = getSession(c);

  const member = await c.env.DB.prepare(
    'SELECT display_name FROM members WHERE id = ? AND deleted_at IS NULL',
  ).bind(session.member_id).first<{ display_name: string }>();

  if (!c.env.RELFI_SERVICE_SECRET) {
    console.error('[relfi-handoff] RELFI_SERVICE_SECRET is missing or empty');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const handoff = await signHandoff(c.env, {
    sub: session.member_id,
    email: session.email,
    username: session.username,
    display_name: member?.display_name || session.username,
    role: session.role,
  });

  return c.json({ handoff });
});
