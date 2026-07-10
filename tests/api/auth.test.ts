import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../workers/api/src/index.js';

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    },
    ALPHAMINDS_SESSIONS: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    ALPHAMINDS_SUBSCRIPTION_CACHE: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    ALPHAMINDS_DAILY_DELIVERY: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    ALPHAMINDS_RATE_LIMITS: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    ALPHAMINDS_CONTENT_SCHEDULE_CACHE: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    ALPHAMINDS_CHAPTER_CONFIG: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    MEDIA_BUCKET: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
    BACKUP_BUCKET: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
    JWT_SESSION_SECRET: 'test-secret',
    RESEND_API_KEY: 'test-resend-key',
    WEB_PUSH_VAPID_PRIVATE: 'test-vapid-private',
    WEB_PUSH_VAPID_PUBLIC: 'test-vapid-public',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ENVIRONMENT: 'development',
  } as any;
}

describe('POST /v1/auth/register', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    });
    env.ALPHAMINDS_SESSIONS.put.mockResolvedValue(undefined);
  });

  it('returns 400 for invalid input', async () => {
    const res = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' }),
    }, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 for valid registration', async () => {
    const res = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@test.com',
        username: 'newuser',
        display_name: 'New User',
        password: 'password123',
        primary_house: 'becoming',
      }),
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('member');
  });
});

describe('POST /v1/auth/login', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
    env.ALPHAMINDS_SESSIONS.put.mockResolvedValue(undefined);
  });

  it('returns 400 for invalid input', async () => {
    const res = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env);
    expect(res.status).toBe(400);
  });

  it('returns 401 if member not found', async () => {
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    });
    const res = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('correctPassword', 4);
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'member-1',
          email: 'test@test.com',
          username: 'testuser',
          password_hash: hash,
          role: 'member',
          chapter_id: null,
          is_active: 1,
        }),
      }),
    });
    const res = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrongPassword' }),
    }, env);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /v1/auth/forgot-password', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
    env.ALPHAMINDS_SESSIONS.put.mockResolvedValue(undefined);
  });

  it('returns 400 for missing email', async () => {
    const res = await app.request('/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env);
    expect(res.status).toBe(400);
  });

  it('returns 200 and stores OTP', async () => {
    const res = await app.request('/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(env.ALPHAMINDS_SESSIONS.put).toHaveBeenCalledOnce();
  });
});

describe('POST /v1/auth/verify-otp', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('returns 400 for expired OTP', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue(null);
    const res = await app.request('/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', otp: '123456' }),
    }, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('OTP_EXPIRED');
  });

  it('returns 400 for invalid OTP', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue('654321');
    const res = await app.request('/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', otp: '123456' }),
    }, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_OTP');
  });

  it('returns 200 with reset_token for valid OTP', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue('123456');
    env.ALPHAMINDS_SESSIONS.delete.mockResolvedValue(undefined);
    env.ALPHAMINDS_SESSIONS.put.mockResolvedValue(undefined);
    const res = await app.request('/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', otp: '123456' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('reset_token');
  });
});

describe('POST /v1/auth/reset-password', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('returns 400 for invalid reset token', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue(null);
    const res = await app.request('/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_token: 'bad-token', new_password: 'newpass123' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('returns 200 and updates password', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue('user@test.com');
    env.ALPHAMINDS_SESSIONS.delete.mockResolvedValue(undefined);
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    });
    const res = await app.request('/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_token: 'valid-token', new_password: 'newpass123' }),
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for short password', async () => {
    const res = await app.request('/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_token: 'token', new_password: 'short' }),
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('POST /v1/auth/logout', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
    env.ALPHAMINDS_SESSIONS.delete.mockResolvedValue(undefined);
  });

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/auth/logout', { method: 'POST' }, env);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid auth', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue({
      member_id: 'member-1',
      email: 'test@test.com',
      username: 'testuser',
      role: 'member',
      chapter_id: null,
      subscription_tier: 'free',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await app.request('/v1/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('GET /v1/auth/me', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/auth/me', {}, env);
    expect(res.status).toBe(401);
  });

  it('returns 401 with expired session', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue({
      member_id: 'member-1',
      email: 'test@test.com',
      username: 'testuser',
      role: 'member',
      chapter_id: null,
      subscription_tier: 'free',
      issued_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    });
    const res = await app.request('/v1/auth/me', {
      headers: { Authorization: 'Bearer expired-token' },
    }, env);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid auth and member data', async () => {
    env.ALPHAMINDS_SESSIONS.get.mockResolvedValue({
      member_id: 'member-1',
      email: 'test@test.com',
      username: 'testuser',
      role: 'member',
      chapter_id: null,
      subscription_tier: 'free',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'member-1',
          email: 'test@test.com',
          username: 'testuser',
          display_name: 'Test User',
          primary_house: 'becoming',
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    });
    const res = await app.request('/v1/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    }, env);
    expect(res.status).toBe(200);
  });
});
