import { Context, MiddlewareHandler } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export async function resolveSession(c: Context<AuthEnv>): Promise<SessionPayload | null> {
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

  if (!token) return null;

  const session = await c.env.ALPHAMINDS_SESSIONS.get('session:' + token, 'json') as SessionPayload | null;

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await c.env.ALPHAMINDS_SESSIONS.delete('session:' + token);
    return null;
  }

  const hoursRemaining = (new Date(session.expires_at).getTime() - Date.now()) / 3600000;
  if (hoursRemaining < 24) {
    session.expires_at = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    await c.env.ALPHAMINDS_SESSIONS.put('session:' + token, JSON.stringify(session), { expirationTtl: 604800 });
  }

  return session;
}

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await resolveSession(c);

  if (!session) {
    return c.json({ error: 'Missing or invalid token', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('session', session);
  return await next();
};

export function getSession(c: Context<AuthEnv>): SessionPayload {
  return c.get('session');
}
