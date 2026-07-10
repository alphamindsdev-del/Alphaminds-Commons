import { MiddlewareHandler } from 'hono';
import { Env } from '../../../shared/types.js';

type CorsEnv = { Bindings: Env };

const ALLOWED_ORIGINS = [
  'https://app.alphaminds.com',
  'https://commons.alphaminds.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

const PREVIEW_REGEX = /https:\/\/.*\.alphaminds\.pages\.dev/;

export const corsMiddleware: MiddlewareHandler<CorsEnv> = async (c, next) => {
  const origin = c.req.header('Origin');
  let allowedOrigin = '';

  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else if (c.env.ENVIRONMENT === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
      allowedOrigin = origin;
    } else if (c.env.ENVIRONMENT !== 'production' && PREVIEW_REGEX.test(origin)) {
      allowedOrigin = origin;
    }
  }

  if (allowedOrigin) {
    c.header('Access-Control-Allow-Origin', allowedOrigin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  return await next();
};
