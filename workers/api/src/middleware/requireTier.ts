import { MiddlewareHandler } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { Tier, TIER_ORDER } from '../../../shared/constants.js';

type TierEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export function requireTier(requiredTier: Tier): MiddlewareHandler<TierEnv> {
  return async (c, next) => {
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
    }

    let currentTier: Tier;
    const cached = await c.env.ALPHAMINDS_SUBSCRIPTION_CACHE.get('sub:' + session.member_id, 'json') as { tier: Tier; expires_at: string } | null;

    if (cached && new Date(cached.expires_at) > new Date()) {
      currentTier = cached.tier;
    } else {
      const stmt = c.env.DB.prepare('SELECT tier, status FROM subscriptions WHERE member_id = ? AND status = \'active\' ORDER BY created_at DESC LIMIT 1');
      const sub = await stmt.bind(session.member_id).first<{ tier: Tier }>();

      currentTier = sub ? sub.tier : 'free';

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      await c.env.ALPHAMINDS_SUBSCRIPTION_CACHE.put(
        'sub:' + session.member_id,
        JSON.stringify({ tier: currentTier, expires_at: expiresAt }),
        { expirationTtl: 3600 }
      );
    }

    if (TIER_ORDER[currentTier] < TIER_ORDER[requiredTier]) {
      return c.json({
        error: 'This feature requires a higher subscription tier.',
        code: 'UPGRADE_REQUIRED',
        upgrade_required: true,
        current_tier: currentTier,
        required_tier: requiredTier,
      }, 403);
    }

    return await next();
  };
}
