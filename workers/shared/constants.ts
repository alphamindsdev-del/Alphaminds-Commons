// Shared application constants

export const HOUSES = ['becoming', 'connection', 'wellness', 'play', 'humanity'] as const;
export type House = typeof HOUSES[number];
export type HouseOrGlobal = House | 'global';

export const TIERS = ['free', 'basic', 'premium'] as const;
export type Tier = typeof TIERS[number];

export const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
};

export const ROLES = ['member', 'moderator', 'house_lead', 'admin', 'founder'] as const;
export type Role = typeof ROLES[number];

export const ROLE_ORDER: Record<Role, number> = {
  member: 0,
  moderator: 1,
  house_lead: 2,
  admin: 3,
  founder: 4,
};

export const WEEKLY_HOUSE_THEME: Record<string, HouseOrGlobal> = {
  monday: 'becoming',
  tuesday: 'global',
  wednesday: 'connection',
  thursday: 'wellness',
  friday: 'play',
  saturday: 'global',
  sunday: 'humanity',
};

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  UPGRADE_REQUIRED: 'UPGRADE_REQUIRED',
  EVENT_FULL: 'EVENT_FULL',
  RETAKE_NOT_AVAILABLE: 'RETAKE_NOT_AVAILABLE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
