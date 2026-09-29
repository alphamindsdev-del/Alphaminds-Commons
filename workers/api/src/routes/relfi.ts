import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../../../shared/types.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { ERROR_CODES } from '../../../shared/constants.js';

type RelFiEnv = { Bindings: Env; Variables: { session: import('../../../shared/types.js').SessionPayload } };

const relfiRouter = new Hono<RelFiEnv>();

const GameResultSchema = z.object({
  gameId: z.string().uuid(),
  roomCode: z.string().length(5),
  mode: z.enum(['solo', 'seer_skeptic', 'multiplayer_seer']),
  tokensEarned: z.number().int().min(0).max(1000),
  roundsPlayed: z.number().int().min(1).max(50),
  finalRank: z.number().int().min(1).optional(),
  totalPlayers: z.number().int().min(1).max(20),
  completedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

relfiRouter.post('/game-result', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = GameResultSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const gameResult = parsed.data;

  const session = getSession(c);
  const now = new Date().toISOString();

  const stats = await c.env.DB.prepare(
    `SELECT * FROM member_stats WHERE member_id = ? AND deleted_at IS NULL`
  ).bind(session.member_id).first<{
    play_score: number;
    total_points: number;
    total_score: number;
    challenges_completed: number;
    last_activity_at: string | null;
  }>();

  if (!stats) {
    return c.json({ error: 'Member stats not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const newPlayScore = stats.play_score + gameResult.tokensEarned;
  const newTotalPoints = stats.total_points + gameResult.tokensEarned;
  const newTotalScore = stats.total_score + gameResult.tokensEarned;
  const newChallengesCompleted = stats.challenges_completed + 1;

  await c.env.DB.prepare(
    `UPDATE member_stats SET 
      play_score = ?, 
      total_points = ?, 
      total_score = ?, 
      challenges_completed = ?, 
      last_activity_at = ?, 
      updated_at = ? 
    WHERE member_id = ?`
  ).bind(newPlayScore, newTotalPoints, newTotalScore, newChallengesCompleted, now, now, session.member_id).run();

  await c.env.DB.prepare(
    `INSERT INTO member_chapter_history (id, member_id, from_chapter_id, to_chapter_id, reason, created_at)
    VALUES (?, ?, ?, ?, 'relfi_game', ?)`
  ).bind(crypto.randomUUID(), session.member_id, null, null, now).run();

  const updatedStats = await c.env.DB.prepare(
    `SELECT becoming_score, connection_score, wellness_score, play_score, humanity_score, total_score, impact_score, current_streak_days, longest_streak_days, total_points, volunteer_hours, challenges_completed, events_attended, posts_authored, rooms_joined, detectors_completed FROM member_stats WHERE member_id = ? AND deleted_at IS NULL`
  ).bind(session.member_id).first();

  return c.json({ success: true, stats: updatedStats });
});

relfiRouter.get('/stats', authMiddleware, async (c) => {
  const session = getSession(c);

  const stats = await c.env.DB.prepare(
    `SELECT becoming_score, connection_score, wellness_score, play_score, humanity_score, total_score, impact_score, current_streak_days, longest_streak_days, total_points, volunteer_hours, challenges_completed, events_attended, posts_authored, rooms_joined, detectors_completed, last_activity_at FROM member_stats WHERE member_id = ? AND deleted_at IS NULL`
  ).bind(session.member_id).first();

  if (!stats) {
    return c.json({ error: 'Member stats not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  return c.json({ stats });
});

relfiRouter.get('/leaderboard', authMiddleware, async (c) => {
  const session = getSession(c);
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const members = await c.env.DB.prepare(
    `SELECT m.id, m.display_name, m.username, m.avatar_r2_key, m.primary_house, ms.play_score, ms.total_score, ms.total_points, ms.challenges_completed
    FROM members m
    JOIN member_stats ms ON m.id = ms.member_id
    WHERE m.deleted_at IS NULL AND ms.deleted_at IS NULL AND m.is_active = 1
    ORDER BY ms.play_score DESC, ms.total_score DESC
    LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const currentMemberRank = await c.env.DB.prepare(
    `SELECT COUNT(*) + 1 as rank FROM members m2
    JOIN member_stats ms2 ON m2.id = ms2.member_id
    WHERE m2.deleted_at IS NULL AND ms2.deleted_at IS NULL AND m2.is_active = 1
    AND (ms2.play_score > (SELECT play_score FROM member_stats WHERE member_id = ?) 
         OR (ms2.play_score = (SELECT play_score FROM member_stats WHERE member_id = ?) AND ms2.total_score > (SELECT total_score FROM member_stats WHERE member_id = ?)))`
  ).bind(session.member_id, session.member_id, session.member_id).first<{ rank: number }>();

  return c.json({
    leaderboard: members.results,
    currentUserRank: currentMemberRank?.rank || null,
  });
});

export { relfiRouter };