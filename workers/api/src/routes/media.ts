import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { uploadMedia } from '../lib/r2.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const mediaRouter = new Hono<{ Bindings: Env }>();

mediaRouter.get('/*', async (c) => {
  const key = c.req.path.replace('/v1/media/', '');
  const rangeHeader = c.req.header('range');

  if (rangeHeader) {
    const head = await c.env.MEDIA_BUCKET.head(key);
    if (!head) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);

    const size = head.size;
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) return c.json({ error: 'Invalid range', code: ERROR_CODES.VALIDATION_ERROR }, 416);

    const g1 = match[1] ?? '';
    const g2 = match[2] ?? '';
    const start = g1 !== '' ? parseInt(g1, 10) : undefined;
    const end = g2 !== '' ? parseInt(g2, 10) : undefined;

    let offset = 0;
    let length = size;
    if (start !== undefined && end !== undefined) {
      offset = start;
      length = end - start + 1;
    } else if (start !== undefined) {
      offset = start;
      length = size - start;
    } else if (end !== undefined) {
      offset = size - end;
      length = end;
    }

    if (offset >= size || length <= 0) {
      return c.json({ error: 'Range not satisfiable', code: ERROR_CODES.VALIDATION_ERROR }, 416);
    }

    const ranged = await c.env.MEDIA_BUCKET.get(key, { range: { offset, length } });
    if (!ranged) return c.json({ error: 'Not found' }, 404);

    const headers = new Headers();
    head.writeHttpMetadata(headers);
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${size}`);
    headers.set('Content-Length', String(length));
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(ranged.body, { status: 206, headers });
  }

  const obj = await c.env.MEDIA_BUCKET.get(key);
  if (!obj) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
});

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
