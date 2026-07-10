import { describe, it, expect, vi } from 'vitest';
import { createErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@shared/errors';

function createMockContext() {
  return {
    json: vi.fn().mockReturnValue({ body: 'mock' }),
  } as any;
}

describe('error helpers', () => {
  describe('createErrorResponse', () => {
    it('creates error response with message and code', () => {
      const c = createMockContext();
      createErrorResponse(c, 'Something went wrong', 'INTERNAL_ERROR', 500);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Something went wrong', code: 'INTERNAL_ERROR' },
        500,
      );
    });

    it('includes details when provided', () => {
      const c = createMockContext();
      const details = { field: 'email', reason: 'already taken' };
      createErrorResponse(c, 'Validation failed', 'VALIDATION_ERROR', 400, details);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details },
        400,
      );
    });

    it('defaults to status 400', () => {
      const c = createMockContext();
      createErrorResponse(c, 'Bad request', 'VALIDATION_ERROR');
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Bad request', code: 'VALIDATION_ERROR' },
        400,
      );
    });
  });

  describe('unauthorizedResponse', () => {
    it('returns 401 with default message', () => {
      const c = createMockContext();
      unauthorizedResponse(c);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid token', code: 'UNAUTHORIZED' },
        401,
      );
    });

    it('returns 401 with custom message', () => {
      const c = createMockContext();
      unauthorizedResponse(c, 'Custom auth error');
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Custom auth error', code: 'UNAUTHORIZED' },
        401,
      );
    });
  });

  describe('forbiddenResponse', () => {
    it('returns 403 with default message', () => {
      const c = createMockContext();
      forbiddenResponse(c);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Access denied', code: 'FORBIDDEN' },
        403,
      );
    });
  });

  describe('notFoundResponse', () => {
    it('returns 404 with default message', () => {
      const c = createMockContext();
      notFoundResponse(c);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Resource not found', code: 'NOT_FOUND' },
        404,
      );
    });
  });
});
