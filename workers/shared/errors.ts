// Shared API error helpers
import { Context } from 'hono';
import { ErrorCode } from './constants.js';

export function createErrorResponse(
  c: Context,
  message: string,
  code: ErrorCode,
  status: number = 400,
  details?: any
) {
  return c.json(
    {
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    // @ts-expect-error: Hono StatusCode type mismatch safety
    status
  );
}

export function unauthorizedResponse(c: Context, message: string = 'Missing or invalid token') {
  return createErrorResponse(c, message, 'UNAUTHORIZED', 401);
}

export function forbiddenResponse(c: Context, message: string = 'Access denied') {
  return createErrorResponse(c, message, 'FORBIDDEN', 403);
}

export function notFoundResponse(c: Context, message: string = 'Resource not found') {
  return createErrorResponse(c, message, 'NOT_FOUND', 404);
}
