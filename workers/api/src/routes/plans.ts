import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const plansRouter = new Hono<{ Bindings: Env }>();

plansRouter.get('/', authMiddleware as any, async (c) => {
  const session = getSession(c as any);
  const plans = await c.env.DB.prepare(
    'SELECT p.*, (SELECT COUNT(*) FROM plan_items pi WHERE pi.plan_id = p.id) as total_items FROM plans p WHERE p.is_published = 1 AND p.deleted_at IS NULL ORDER BY p.created_at DESC'
  ).all();
  const plansWithProgress = await Promise.all(plans.results.map(async (plan: any) => {
    const completed = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM plan_progress WHERE plan_id = ? AND member_id = ?'
    ).bind(plan.id, session.member_id).first<{ count: number }>();
    return { ...plan, completed_items: completed?.count ?? 0 };
  }));
  return c.json(plansWithProgress);
});

plansRouter.get('/:id', authMiddleware as any, async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const plan = await c.env.DB.prepare(
    'SELECT * FROM plans WHERE id = ? AND is_published = 1 AND deleted_at IS NULL'
  ).bind(id).first();
  if (!plan) return c.json({ error: 'Not found', code: ERROR_CODES.NOT_FOUND }, 404);
  const sections = await c.env.DB.prepare(
    'SELECT * FROM plan_sections WHERE plan_id = ? ORDER BY sort_order ASC'
  ).bind(id).all();
  const items = await c.env.DB.prepare(
    'SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order ASC'
  ).bind(id).all();
  const progress = await c.env.DB.prepare(
    'SELECT plan_item_id FROM plan_progress WHERE plan_id = ? AND member_id = ?'
  ).bind(id, session.member_id).all();
  const completedIds = new Set(progress.results.map((p: any) => p.plan_item_id));
  const itemsWithProgress = items.results.map((item: any) => ({
    ...item,
    completed: completedIds.has(item.id),
  }));
  return c.json({ ...(plan as any), sections: sections.results, items: itemsWithProgress });
});

plansRouter.post('/:id/complete/:itemId', authMiddleware as any, async (c) => {
  const session = getSession(c as any);
  const { id, itemId } = c.req.param();
  const existing = await c.env.DB.prepare(
    'SELECT id FROM plan_progress WHERE plan_id = ? AND member_id = ? AND plan_item_id = ?'
  ).bind(id, session.member_id, itemId).first();
  if (existing) return c.json({ success: true, already_completed: true });
  await c.env.DB.prepare(
    'INSERT INTO plan_progress (id, plan_id, member_id, plan_item_id) VALUES (?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), id, session.member_id, itemId).run();
  return c.json({ success: true, already_completed: false });
});
