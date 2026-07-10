import { describe, it, expect } from 'vitest';
import { HOUSES, TIERS, TIER_ORDER, ROLES, ROLE_ORDER, WEEKLY_HOUSE_THEME, ERROR_CODES } from '@shared/constants';

describe('shared constants', () => {
  it('HOUSES has 5 houses', () => {
    expect(HOUSES).toHaveLength(5);
    expect(HOUSES).toContain('becoming');
    expect(HOUSES).toContain('connection');
    expect(HOUSES).toContain('wellness');
    expect(HOUSES).toContain('play');
    expect(HOUSES).toContain('humanity');
  });

  it('TIERS has 3 tiers in order', () => {
    expect(TIERS).toEqual(['free', 'basic', 'premium']);
    expect(TIER_ORDER.free).toBe(0);
    expect(TIER_ORDER.basic).toBe(1);
    expect(TIER_ORDER.premium).toBe(2);
  });

  it('ROLES has 5 roles in order', () => {
    expect(ROLES).toEqual(['member', 'moderator', 'house_lead', 'admin', 'founder']);
    expect(ROLE_ORDER.member).toBe(0);
    expect(ROLE_ORDER.moderator).toBe(1);
    expect(ROLE_ORDER.house_lead).toBe(2);
    expect(ROLE_ORDER.admin).toBe(3);
    expect(ROLE_ORDER.founder).toBe(4);
  });

  it('WEEKLY_HOUSE_THEME maps all weekdays', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach((day) => {
      expect(WEEKLY_HOUSE_THEME[day]).toBeDefined();
    });
    expect(WEEKLY_HOUSE_THEME.monday).toBe('becoming');
    expect(WEEKLY_HOUSE_THEME.tuesday).toBe('global');
    expect(WEEKLY_HOUSE_THEME.sunday).toBe('humanity');
  });

  it('ERROR_CODES has all expected codes', () => {
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.EMAIL_TAKEN).toBe('EMAIL_TAKEN');
    expect(ERROR_CODES.USERNAME_TAKEN).toBe('USERNAME_TAKEN');
    expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(ERROR_CODES.ACCOUNT_SUSPENDED).toBe('ACCOUNT_SUSPENDED');
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ERROR_CODES.INVALID_OTP).toBe('INVALID_OTP');
    expect(ERROR_CODES.OTP_EXPIRED).toBe('OTP_EXPIRED');
    expect(ERROR_CODES.UPGRADE_REQUIRED).toBe('UPGRADE_REQUIRED');
    expect(ERROR_CODES.EVENT_FULL).toBe('EVENT_FULL');
    expect(ERROR_CODES.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
    expect(ERROR_CODES.UNSUPPORTED_MEDIA_TYPE).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});
