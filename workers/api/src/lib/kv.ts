import { Env, SessionPayload } from '../../../shared/types.js';

export async function getSession(env: Env, token: string): Promise<SessionPayload | null> {
  return env.ALPHAMINDS_SESSIONS.get(`session:${token}`, 'json') as Promise<SessionPayload | null>;
}

export async function setSession(env: Env, token: string, session: SessionPayload): Promise<void> {
  await env.ALPHAMINDS_SESSIONS.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 7 * 24 * 3600 });
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.ALPHAMINDS_SESSIONS.delete(`session:${token}`);
}

export async function getCachedTier(env: Env, memberId: string): Promise<string | null> {
  return env.ALPHAMINDS_SUBSCRIPTION_CACHE.get(`tier:${memberId}`);
}

export async function setCachedTier(env: Env, memberId: string, tier: string, ttl?: number): Promise<void> {
  await env.ALPHAMINDS_SUBSCRIPTION_CACHE.put(`tier:${memberId}`, tier, { expirationTtl: ttl ?? 3600 });
}

export async function deleteCachedTier(env: Env, memberId: string): Promise<void> {
  await env.ALPHAMINDS_SUBSCRIPTION_CACHE.delete(`tier:${memberId}`);
}

export async function getDailyContentCache(env: Env, date: string): Promise<string | null> {
  return env.ALPHAMINDS_DAILY_DELIVERY.get(`daily:content:${date}`);
}

export async function setDailyContentCache(env: Env, date: string, value: string, ttl?: number): Promise<void> {
  await env.ALPHAMINDS_DAILY_DELIVERY.put(`daily:content:${date}`, value, { expirationTtl: ttl ?? 86400 });
}

export async function deleteDailyContentCache(env: Env, date: string): Promise<void> {
  await env.ALPHAMINDS_DAILY_DELIVERY.delete(`daily:content:${date}`);
}

export async function getRateLimit(env: Env, key: string): Promise<string | null> {
  return env.ALPHAMINDS_RATE_LIMITS.get(`ratelimit:${key}`);
}

export async function setRateLimit(env: Env, key: string, value: string, ttl: number): Promise<void> {
  await env.ALPHAMINDS_RATE_LIMITS.put(`ratelimit:${key}`, value, { expirationTtl: ttl });
}

export async function getContentSchedule(env: Env, house: string, dayOfWeek: string): Promise<string | null> {
  return env.ALPHAMINDS_CONTENT_SCHEDULE_CACHE.get(`schedule:${house}:${dayOfWeek}`);
}

export async function setContentSchedule(env: Env, house: string, dayOfWeek: string, value: string, ttl?: number): Promise<void> {
  await env.ALPHAMINDS_CONTENT_SCHEDULE_CACHE.put(`schedule:${house}:${dayOfWeek}`, value, { expirationTtl: ttl ?? 3600 });
}
