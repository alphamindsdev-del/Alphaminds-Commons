import { Env, SessionPayload } from '../../../shared/types.js';

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function createSessionPayload(params: {
  member_id: string;
  email: string;
  username: string;
  role: string;
  chapter_id: string | null;
  subscription_tier: string;
}): SessionPayload {
  const now = new Date();
  return {
    member_id: params.member_id,
    email: params.email,
    username: params.username,
    role: params.role as any,
    chapter_id: params.chapter_id,
    subscription_tier: params.subscription_tier as any,
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function storeSession(env: Env, token: string, session: SessionPayload): Promise<void> {
  await env.ALPHAMINDS_SESSIONS.put(
    `session:${token}`,
    JSON.stringify(session),
    { expirationTtl: 7 * 24 * 3600 }
  );
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.ALPHAMINDS_SESSIONS.delete(`session:${token}`);
}

export async function getSessionByToken(env: Env, token: string): Promise<SessionPayload | null> {
  return env.ALPHAMINDS_SESSIONS.get(`session:${token}`, 'json') as Promise<SessionPayload | null>;
}
