import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { CreateCodeSchema, UpdateCodeSchema } from '../lib/validation.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const codeRouter = new Hono<{ Bindings: Env }>();

// ── Public: today's code (latest published) ──────────────────────────────
codeRouter.get('/today', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT * FROM the_code
     WHERE deleted_at IS NULL AND is_published = 1
     ORDER BY scheduled_date DESC, created_at DESC
     LIMIT 1`
  ).first<{
    id: string;
    title: string;
    passage: string;
    scheduled_date: string | null;
    is_published: number;
  }>();

  if (!row) {
    return c.json({ id: null, title: null, passage: null, scheduled_date: null, is_published: false });
  }

  return c.json({
    id: row.id,
    title: row.title,
    passage: row.passage,
    scheduled_date: row.scheduled_date,
    is_published: !!row.is_published,
  });
});

// ── Authenticated: save / list saved passages ───────────────────────────
codeRouter.post('/:id/save', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();

  const code = await c.env.DB.prepare(
    'SELECT id FROM the_code WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ id: string }>();
  if (!code) {
    return c.json({ error: 'Code not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO saved_code_passages (id, member_id, code_id, created_at) VALUES (?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), session.member_id, id, new Date().toISOString()).run();

  return c.json({ success: true });
});

codeRouter.get('/saved', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const rows = await c.env.DB.prepare(
    `SELECT tc.id, tc.title, tc.passage, tc.scheduled_date, sc.created_at as saved_at
     FROM saved_code_passages sc
     JOIN the_code tc ON tc.id = sc.code_id
     WHERE sc.member_id = ? AND tc.deleted_at IS NULL
     ORDER BY sc.created_at DESC`
  ).bind(session.member_id).all();
  return c.json({ data: rows.results });
});
