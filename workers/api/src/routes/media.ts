import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { uploadMedia } from '../lib/r2.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const mediaRouter = new Hono<{ Bindings: Env }>();

mediaRouter.post('/upload', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | null;

  if (!file) {
    return c.json({ error: 'No file provided', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  try {
    const result = await uploadMedia(c.env, session.member_id, file);
    return c.json(result, 201);
  } catch (err: any) {
    if (err.message === 'Unsupported media type') {
      return c.json({ error: 'Unsupported media type', code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE }, 415);
    }
    if (err.message === 'File too large') {
      return c.json({ error: 'File too large', code: ERROR_CODES.FILE_TOO_LARGE }, 413);
    }
    return c.json({ error: 'Upload failed', code: ERROR_CODES.INTERNAL_ERROR }, 500);
  }
});
