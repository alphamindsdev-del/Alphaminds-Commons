import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const journeyRouter = new Hono<{ Bindings: Env }>();

const LEVELS = ['SEEKER', 'EXAMINER', 'FACILITATOR', 'STEWARD', 'CHAPTER_LEADER', 'COORDINATOR'];

interface ActivityRow {
  id: string;
  level: string;
  title: string;
  description: string | null;
  type: string;
  instructions: string | null;
  position: number;
  is_required: number;
  content: string | null;
}

async function buildJourney(db: D1Database, memberId: string, level: string) {
  const [activities, progress] = await Promise.all([
    db.prepare(
      `SELECT id, level, title, description, type, instructions, position, is_required, content
       FROM journey_activities
       WHERE level = ? AND is_published = 1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`
    ).bind(level).all<ActivityRow>(),
    db.prepare(
      'SELECT activity_id, status, completed_at FROM member_journey_progress WHERE member_id = ?'
    ).bind(memberId).all<{ activity_id: string; status: string; completed_at: string | null }>(),
  ]);

  const progressMap = new Map(progress.results.map((p) => [p.activity_id, p]));

  let activeAssigned = false;
  const steps = activities.results.map((a) => {
    const completed = progressMap.get(a.id)?.status === 'completed';
    let status: 'completed' | 'active' | 'locked';
    if (completed) {
      status = 'completed';
    } else if (!activeAssigned) {
      activeAssigned = true;
      status = 'active';
    } else {
      status = 'locked';
    }
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      instructions: a.instructions,
      content: a.content,
      position: a.position,
      is_required: !!a.is_required,
      status,
      completed_at: progressMap.get(a.id)?.completed_at ?? null,
    };
  });

  const currentIndex = LEVELS.indexOf(level);
  return {
    level,
    next_level: currentIndex >= 0 && currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null,
    completed_count: steps.filter((s) => s.status === 'completed').length,
    total_count: steps.length,
    activities: steps,
  };
}

// ── Member: current journey state ────────────────────────────────────────
journeyRouter.get('/', authMiddleware, async (c) => {
  const session = getSession(c as any);

  const member = await c.env.DB.prepare(
    'SELECT membership_level FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ membership_level: string }>();
  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  return c.json(await buildJourney(c.env.DB, session.member_id, member.membership_level));
});

// ── Member: complete the active activity ─────────────────────────────────
journeyRouter.post('/activities/:id/complete', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const now = new Date().toISOString();

  const member = await c.env.DB.prepare(
    'SELECT membership_level FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ membership_level: string }>();
  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const activity = await c.env.DB.prepare(
    'SELECT id, level, position FROM journey_activities WHERE id = ? AND is_published = 1 AND deleted_at IS NULL'
  ).bind(id).first<{ id: string; level: string; position: number }>();
  if (!activity) {
    return c.json({ error: 'Activity not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }
  if (activity.level !== member.membership_level) {
    return c.json({ error: 'This activity is not part of your current level', code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }

  const earlier = await c.env.DB.prepare(
    `SELECT a.id FROM journey_activities a
     WHERE a.level = ? AND a.is_published = 1 AND a.deleted_at IS NULL AND a.position < ?
       AND NOT EXISTS (
         SELECT 1 FROM member_journey_progress p
         WHERE p.member_id = ? AND p.activity_id = a.id AND p.status = 'completed'
       )
     LIMIT 1`
  ).bind(activity.level, activity.position, session.member_id).first();
  if (earlier) {
    return c.json({ error: 'Complete the earlier steps first', code: ERROR_CODES.FORBIDDEN }, 403);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM member_journey_progress WHERE member_id = ? AND activity_id = ?'
  ).bind(session.member_id, id).first();
  if (existing) {
    await c.env.DB.prepare(
      'UPDATE member_journey_progress SET status = ?, completed_at = ?, updated_at = ? WHERE member_id = ? AND activity_id = ?'
    ).bind('completed', now, now, session.member_id, id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO member_journey_progress (id, member_id, activity_id, status, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), session.member_id, id, 'completed', now, now, now).run();
  }

  // Auto-promote when every required activity of the current level is complete
  let promoted = false;
  let newLevel: string | null = null;

  const required = await c.env.DB.prepare(
    'SELECT id FROM journey_activities WHERE level = ? AND is_required = 1 AND is_published = 1 AND deleted_at IS NULL'
  ).bind(member.membership_level).all<{ id: string }>();

  if (required.results.length > 0) {
    const placeholders = required.results.map(() => '?').join(', ');
    const doneCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM member_journey_progress WHERE member_id = ? AND activity_id IN (${placeholders}) AND status = 'completed'`
    ).bind(session.member_id, ...required.results.map((a) => a.id)).first<{ count: number }>();

    if ((doneCount?.count ?? 0) >= required.results.length) {
      const currentIndex = LEVELS.indexOf(member.membership_level);
      if (currentIndex >= 0 && currentIndex < LEVELS.length - 1) {
        newLevel = LEVELS[currentIndex + 1] ?? null;
        await c.env.DB.prepare(
          'UPDATE members SET membership_level = ?, updated_at = ? WHERE id = ?'
        ).bind(newLevel, now, session.member_id).run();

        await c.env.DB.prepare(
          'INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), session.member_id, 'promote_member', 'member', session.member_id, JSON.stringify({ from: member.membership_level, to: newLevel, via: 'journey' }), now).run();

        promoted = true;
      }
    }
  }

  const journey = await buildJourney(c.env.DB, session.member_id, newLevel ?? member.membership_level);
  return c.json({ success: true, promoted, new_level: newLevel, journey });
});
