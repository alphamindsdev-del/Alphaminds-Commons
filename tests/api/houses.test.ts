import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../workers/api/src/index.js';

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      all: vi.fn(),
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

describe('GET /v1/houses', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 5 }),
      }),
    });
  });

  it('returns all 5 houses with counts', async () => {
    const res = await app.request('/v1/houses', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(5);
    body.data.forEach((item: any) => {
      expect(item).toHaveProperty('house');
      expect(item).toHaveProperty('room_count');
      expect(item).toHaveProperty('member_count');
      expect(item).toHaveProperty('event_count');
    });
  });
});

describe('GET /v1/houses/:houseId', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('returns 404 for invalid house', async () => {
    const res = await app.request('/v1/houses/invalid', {}, env);
    expect(res.status).toBe(404);
  });

  it('returns 404 if house not in database', async () => {
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    });
    const res = await app.request('/v1/houses/becoming', {}, env);
    expect(res.status).toBe(404);
  });

  it('returns house details with rooms, events, challenges', async () => {
    const mockHouse = { id: 'becoming', name: 'House of Becoming', description: 'Test' };
    env.DB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(mockHouse),
      all: vi.fn().mockResolvedValue({ results: [{ id: 'room-1', name: 'Room 1' }] }),
    });
    const res = await app.request('/v1/houses/becoming', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('becoming');
    expect(body.rooms).toBeDefined();
    expect(body.upcoming_events).toBeDefined();
    expect(body.active_challenges).toBeDefined();
  });
});
