import { Context, MiddlewareHandler } from 'hono';
import { Env } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';

type RateLimitEnv = { Bindings: Env };

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyFn: (c: Context<RateLimitEnv>) => string;
}

export function rateLimit(config: RateLimitConfig): MiddlewareHandler<RateLimitEnv> {
  return async (c, next) => {
    const key = 'rl:' + config.keyFn(c);
    const now = Math.floor(Date.now() / 1000);

    const data = await c.env.ALPHAMINDS_RATE_LIMITS.get(key, 'json') as { count: number; window_start: number } | null;

    if (!data || now - data.window_start > config.windowSeconds) {
      await c.env.ALPHAMINDS_RATE_LIMITS.put(key, JSON.stringify({ count: 1, window_start: now }), { expirationTtl: config.windowSeconds });
      c.header('X-RateLimit-Limit', String(config.maxRequests));
      c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
      c.header('X-RateLimit-Reset', String(now + config.windowSeconds));
      return await next();
    }

    if (data.count >= config.maxRequests) {
      const retryAfter = data.window_start + config.windowSeconds - now;
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(config.maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(data.window_start + config.windowSeconds));
      return c.json({ error: 'Rate limit exceeded', code: ERROR_CODES.RATE_LIMIT_EXCEEDED }, 429);
    }

    data.count++;
    await c.env.ALPHAMINDS_RATE_LIMITS.put(key, JSON.stringify(data), { expirationTtl: config.windowSeconds });
    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(config.maxRequests - data.count));
    c.header('X-RateLimit-Reset', String(data.window_start + config.windowSeconds));

    return await next();
  };
}

export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const kvKey = 'rl:' + key;
  const now = Math.floor(Date.now() / 1000);

  const data = await c.env.ALPHAMINDS_RATE_LIMITS.get(kvKey, 'json') as { count: number; window_start: number } | null;

  if (!data || now - data.window_start > windowSeconds) {
    await c.env.ALPHAMINDS_RATE_LIMITS.put(kvKey, JSON.stringify({ count: 1, window_start: now }), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - 1, reset: now + windowSeconds };
  }

  if (data.count >= maxRequests) {
    return { allowed: false, remaining: 0, reset: data.window_start + windowSeconds };
  }

  data.count++;
  await c.env.ALPHAMINDS_RATE_LIMITS.put(kvKey, JSON.stringify(data), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: maxRequests - data.count, reset: data.window_start + windowSeconds };
}
