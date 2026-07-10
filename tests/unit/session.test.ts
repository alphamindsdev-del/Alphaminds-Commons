import { describe, it, expect, vi } from 'vitest';
import {
  generateSessionToken,
  createSessionPayload,
} from '../../workers/api/src/lib/session.js';

describe('session utilities', () => {
  describe('generateSessionToken', () => {
    it('generates a UUID string', () => {
      const token = generateSessionToken();
      expect(typeof token).toBe('string');
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('generates unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('createSessionPayload', () => {
    it('creates a session payload with 7-day expiry', () => {
      const payload = createSessionPayload({
        member_id: 'member-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'member',
        chapter_id: null,
        subscription_tier: 'free',
      });

      expect(payload.member_id).toBe('member-1');
      expect(payload.email).toBe('test@example.com');
      expect(payload.username).toBe('testuser');
      expect(payload.role).toBe('member');
      expect(payload.chapter_id).toBeNull();
      expect(payload.subscription_tier).toBe('free');

      const issued = new Date(payload.issued_at);
      const expires = new Date(payload.expires_at);
      expect(expires.getTime() - issued.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
    });

    it('includes chapter_id when provided', () => {
      const payload = createSessionPayload({
        member_id: 'member-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'admin',
        chapter_id: 'chapter-1',
        subscription_tier: 'premium',
      });

      expect(payload.chapter_id).toBe('chapter-1');
      expect(payload.role).toBe('admin');
      expect(payload.subscription_tier).toBe('premium');
    });
  });
});
