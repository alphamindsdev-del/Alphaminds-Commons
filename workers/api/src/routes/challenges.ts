import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { LogProgressSchema, LogProgressInput } from '../lib/validation.js';
import { authMiddleware, getSession } from '../middleware/auth.js';
import { mapChallenge } from '../lib/challenge-mapper.js';
import { houseScoreColumn, touchActivity } from '../lib/scoring.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const challengesRouter = new Hono<{ Bindings: Env }>();

challengesRouter.get('/', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const house = c.req.query('house');

  let queryStr: string;
  let bindParams: any[];

  if (house) {
    queryStr = `SELECT c.*,
                (SELECT COUNT(*) FROM challenge_participations cp WHERE cp.challenge_id = c.id) as participant_count,
                (SELECT CASE WHEN EXISTS (SELECT 1 FROM challenge_participations cp2 WHERE cp2.challenge_id = c.id AND cp2.member_id = ?) THEN 1 ELSE 0 END) as is_participating
                FROM challenges c
                WHERE c.deleted_at IS NULL AND c.is_active = 1 AND c.house = ?
                ORDER BY c.created_at DESC`;
    bindParams = [session.member_id, house];
  } else {
    queryStr = `SELECT c.*,
                (SELECT COUNT(*) FROM challenge_participations cp WHERE cp.challenge_id = c.id) as participant_count,
                (SELECT CASE WHEN EXISTS (SELECT 1 FROM challenge_participations cp2 WHERE cp2.challenge_id = c.id AND cp2.member_id = ?) THEN 1 ELSE 0 END) as is_participating
                FROM challenges c
                WHERE c.deleted_at IS NULL AND c.is_active = 1
                ORDER BY c.created_at DESC`;
    bindParams = [session.member_id];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  return c.json({ data: result.results.map((r: any) => mapChallenge(r)) });
});

challengesRouter.get('/:challengeId', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { challengeId } = c.req.param();

  const challenge = await c.env.DB.prepare(
    `SELECT c.*,
       (SELECT COUNT(*) FROM challenge_participations cp WHERE cp.challenge_id = c.id) as participant_count,
       (SELECT CASE WHEN EXISTS (SELECT 1 FROM challenge_participations cp2 WHERE cp2.challenge_id = c.id AND cp2.member_id = ?) THEN 1 ELSE 0 END) as is_participating
     FROM challenges c
     WHERE c.id = ? AND c.deleted_at IS NULL AND c.is_active = 1`
  ).bind(session.member_id, challengeId).first<any>();

  if (!challenge) {
    return c.json({ error: 'Challenge not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const participation = await c.env.DB.prepare(
    "SELECT * FROM challenge_participations WHERE challenge_id = ? AND member_id = ? AND status = 'active'"
  ).bind(challengeId, session.member_id).first<any>();

  const logs = await c.env.DB.prepare(
    `SELECT cl.logged_date as date, cl.note, cl.value
     FROM challenge_logs cl
     JOIN challenge_participations cp ON cl.participation_id = cp.id
     WHERE cp.challenge_id = ? AND cp.member_id = ?
     ORDER BY cl.created_at DESC LIMIT 10`
  ).bind(challengeId, session.member_id).all();

  const leaderboard = await c.env.DB.prepare(
    `SELECT m.id, m.username, m.display_name, m.primary_house, COALESCE(SUM(cl.value), 0) as value
     FROM challenge_logs cl
     JOIN challenge_participations cp ON cl.participation_id = cp.id
     JOIN members m ON cl.member_id = m.id
     WHERE cp.challenge_id = ? AND m.deleted_at IS NULL
     GROUP BY cl.member_id
     ORDER BY value DESC
     LIMIT 10`
  ).bind(challengeId).all();

  const base = mapChallenge(challenge);
  return c.json({
    ...base,
    joined: !!participation,
    current: participation?.current_value ?? 0,
    participant_count: base.participants,
    days_left: base.daysLeft,
    log: logs.results ?? [],
    leaderboard: leaderboard.results ?? [],
  });
});

challengesRouter.post('/:challengeId/join', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { challengeId } = c.req.param();
  const now = new Date().toISOString();

  const challenge = await c.env.DB.prepare(
    'SELECT * FROM challenges WHERE id = ? AND deleted_at IS NULL AND is_active = 1'
  ).bind(challengeId).first<any>();

  if (!challenge) {
    return c.json({ error: 'Challenge not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM challenge_participations WHERE challenge_id = ? AND member_id = ?'
  ).bind(challengeId, session.member_id).first();

  if (existing) {
    return c.json({ error: 'Already participating', code: ERROR_CODES.VALIDATION_ERROR }, 409);
  }

  await c.env.DB.prepare(
    'INSERT INTO challenge_participations (id, challenge_id, member_id, chapter_id, status, current_value, target_value, completion_pct, log_count, points_awarded, created_at, updated_at) VALUES (?, ?, ?, ?, \'active\', 0, ?, 0, 0, 0, ?, ?)'
  ).bind(crypto.randomUUID(), challengeId, session.member_id, session.chapter_id, challenge.target_value, now, now).run();

  return c.json({ success: true });
});

challengesRouter.post('/:challengeId/log', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { challengeId } = c.req.param();
  const body = await c.req.json();
  const parsed = LogProgressSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { value, note, logged_date } = parsed.data as LogProgressInput;
  const now = new Date().toISOString();

  const participation = await c.env.DB.prepare(
    `SELECT cp.*, c.points_reward, c.house FROM challenge_participations cp JOIN challenges c ON cp.challenge_id = c.id WHERE cp.challenge_id = ? AND cp.member_id = ? AND cp.status = 'active'`
  ).bind(challengeId, session.member_id).first<any>();

  if (!participation) {
    return c.json({ error: 'Not participating in this challenge', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const logId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO challenge_logs (id, participation_id, member_id, value, note, logged_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(logId, participation.id, session.member_id, value, note ?? null, logged_date, now).run();

  const newCurrentValue = (participation.current_value || 0) + value;
  const target = participation.target_value;
  const completionPct = target && target > 0 ? Math.min(100, Math.round((newCurrentValue / target) * 100)) : 0;
  const isCompleted = target && target > 0 && newCurrentValue >= target;

  await c.env.DB.prepare(
    'UPDATE challenge_participations SET current_value = ?, completion_pct = ?, last_logged_at = ?, log_count = log_count + 1, updated_at = ?, completed_at = CASE WHEN ? THEN ? ELSE completed_at END, status = CASE WHEN ? THEN \'completed\' ELSE status END WHERE id = ?'
  ).bind(newCurrentValue, completionPct, now, now, isCompleted ? 1 : 0, isCompleted ? now : null, isCompleted ? 1 : 0, participation.id).run();

  await touchActivity(c.env, session.member_id, new Date(now));

  if (isCompleted) {
    const reward = participation.points_reward || 0;
    const col = houseScoreColumn(participation.house);
    await c.env.DB.prepare(
      `UPDATE member_stats SET total_points = total_points + ?, ${col} = ${col} + ?, total_score = total_score + ?, challenges_completed = challenges_completed + 1, updated_at = ? WHERE member_id = ?`
    ).bind(reward, reward, reward, now, session.member_id).run();

    await c.env.DB.prepare(
      'UPDATE challenge_participations SET points_awarded = ? WHERE id = ?'
    ).bind(reward, participation.id).run();
  }

  return c.json({ success: true, current_value: newCurrentValue, completion_pct: completionPct, completed: isCompleted });
});

export const chapterLeaderboardRouter = new Hono<{ Bindings: Env }>();

chapterLeaderboardRouter.get('/:chapterId/leaderboard', authMiddleware, async (c) => {
  const { chapterId } = c.req.param();
  const period = c.req.query('period') || 'weekly';
  const house = c.req.query('house');
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const conditions: string[] = ['scope_type = \'chapter\'', 'scope_id = ?', 'period_type = ?'];
  const params: any[] = [chapterId, period];
  if (house) { conditions.push('house = ?'); params.push(house); }

  let queryStr: string;
  let bindParams: any[];
  const whereClause = conditions.join(' AND ');

  if (cursor) {
    queryStr = `SELECT ls.*, m.username, m.display_name, m.avatar_r2_key
                FROM leaderboard_snapshots ls
                LEFT JOIN members m ON ls.member_id = m.id
                WHERE ${whereClause} AND ls.id > ?
                ORDER BY ls.score DESC, ls.id ASC LIMIT ?`;
    bindParams = [...params, cursor, actualLimit];
  } else {
    queryStr = `SELECT ls.*, m.username, m.display_name, m.avatar_r2_key
                FROM leaderboard_snapshots ls
                LEFT JOIN members m ON ls.member_id = m.id
                WHERE ${whereClause}
                ORDER BY ls.score DESC, ls.id ASC LIMIT ?`;
    bindParams = [...params, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).id : null,
      has_more: hasMore,
      limit,
    },
  });
});
