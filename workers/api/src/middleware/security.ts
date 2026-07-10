import { MiddlewareHandler } from 'hono';
import { Env } from '../../../shared/types.js';

type SecurityEnv = { Bindings: Env };

export const securityMiddleware: MiddlewareHandler<SecurityEnv> = async (c, next) => {
  await next();

  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.alphaminds.com; connect-src 'self' https://api.alphaminds.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'");
};
