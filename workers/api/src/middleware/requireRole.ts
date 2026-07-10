import { MiddlewareHandler } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { Role, ROLE_ORDER, ERROR_CODES } from '../../../shared/constants.js';

type RoleEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export function requireRole(minimumRole: Role): MiddlewareHandler<RoleEnv> {
  return async (c, next) => {
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED }, 401);
    }

    if (ROLE_ORDER[session.role] < ROLE_ORDER[minimumRole]) {
      return c.json({ error: 'Insufficient permissions', code: ERROR_CODES.FORBIDDEN }, 403);
    }

    if (ROLE_ORDER[minimumRole] >= ROLE_ORDER.admin) {
      const stmt = c.env.DB.prepare('SELECT role, is_active FROM members WHERE id = ?');
      const member = await stmt.bind(session.member_id).first<{ role: Role; is_active: number }>();

      if (!member || !member.is_active) {
        return c.json({ error: 'Account suspended', code: ERROR_CODES.ACCOUNT_SUSPENDED }, 403);
      }

      if (ROLE_ORDER[member.role] < ROLE_ORDER[minimumRole]) {
        return c.json({ error: 'Insufficient permissions', code: ERROR_CODES.FORBIDDEN }, 403);
      }
    }

    return await next();
  };
}
