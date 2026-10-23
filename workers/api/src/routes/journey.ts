import { Hono } from "hono";
import { Env } from "../../../shared/types.js";
import { ERROR_CODES } from "../../../shared/constants.js";
import { authMiddleware, getSession } from "../middleware/auth.js";

export const journeyRouter = new Hono<{ Bindings: Env }>();

export const LEVELS = [
  "SEEKER",
  "EXAMINER",
  "FACILITATOR",
  "STEWARD",
  "CHAPTER_LEADER",
  "COORDINATOR",
];

type CompletionRule = "acknowledge" | "resource" | "quiz" | "activity" | "admin";

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
  link_url: string | null;
  metadata_json: string | null;
}

interface ProgressRow {
  activity_id: string;
  status: string;
  completed_at: string | null;
  started_at: string | null;
  last_started_at: string | null;
  completion_type: string | null;
  verification_status: string | null;
  evidence_json: string | null;
  attempts: number | null;
}

interface AttemptRow {
  id: string;
  activity_id: string;
  status: string;
  completion_type: string | null;
  verification_status: string | null;
  evidence_json: string | null;
  started_at: string;
  completed_at: string | null;
}

function levelIndex(level: string | null | undefined): number {
  return Math.max(0, LEVELS.indexOf(level ?? "SEEKER"));
}

function parseJson(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function resolveRule(activity: ActivityRow): {
  rule: CompletionRule;
  repeatable: boolean;
  passingScore: number;
  questions: any[];
} {
  const meta = parseJson(activity.metadata_json);
  const configured = meta.completion_rule as CompletionRule | undefined;
  let rule: CompletionRule;
  if (
    configured &&
    ["acknowledge", "resource", "quiz", "activity", "admin"].includes(configured)
  ) {
    rule = configured;
  } else if (activity.type === "quiz" || activity.type === "assessment") {
    rule = "quiz";
  } else if (activity.type === "assignment" || activity.type === "claim_file") {
    rule = "admin";
  } else if (activity.type === "rel_fi") {
    rule = "activity";
  } else if (activity.link_url) {
    rule = "resource";
  } else {
    rule = "acknowledge";
  }

  return {
    rule,
    repeatable: meta.repeatable !== false,
    passingScore: Number.isFinite(Number(meta.passing_score)) ? Number(meta.passing_score) : 70,
    questions: Array.isArray(meta.questions) ? meta.questions : [],
  };
}

function ruleLabel(rule: CompletionRule): string {
  switch (rule) {
    case "resource":
      return "Open the linked resource";
    case "quiz":
      return "Pass the assessment";
    case "activity":
      return "Complete the activity";
    case "admin":
      return "Administrator verification";
    default:
      return "Read and acknowledge";
  }
}

function publicQuestions(questions: any[]) {
  return questions.map((q: any, index: number) => ({
    id: q?.id ?? String(index),
    prompt: q?.prompt ?? q?.question ?? "",
    options: Array.isArray(q?.options) ? q.options : [],
  }));
}

async function loadJourneyData(db: D1Database, memberId: string, memberLevel: string) {
  const accessibleLevels = LEVELS.slice(0, levelIndex(memberLevel) + 1);
  const placeholders = accessibleLevels.map(() => "?").join(", ");
  const [activities, progress, attempts] = await Promise.all([
    db
      .prepare(
        `SELECT id, level, title, description, type, instructions, position, is_required,
                content, link_url, metadata_json
         FROM journey_activities
         WHERE level IN (${placeholders}) AND is_published = 1 AND deleted_at IS NULL
         ORDER BY position ASC, created_at ASC`,
      )
      .bind(...accessibleLevels)
      .all<ActivityRow>(),
    db
      .prepare(
        `SELECT activity_id, status, completed_at, started_at, last_started_at,
                completion_type, verification_status, evidence_json, attempts
         FROM member_journey_progress WHERE member_id = ?`,
      )
      .bind(memberId)
      .all<ProgressRow>(),
    db
      .prepare(
        `SELECT id, activity_id, status, completion_type, verification_status,
                evidence_json, started_at, completed_at
         FROM member_journey_attempts
         WHERE member_id = ?
         ORDER BY started_at DESC`,
      )
      .bind(memberId)
      .all<AttemptRow>(),
  ]);

  return {
    activities: activities.results,
    progress: progress.results,
    attempts: attempts.results,
  };
}

export async function buildJourney(
  db: D1Database,
  memberId: string,
  level: string,
  memberLevel: string,
  requestedLevel?: string,
) {
  const { activities: allActivities, progress: allProgress, attempts } = await loadJourneyData(
    db,
    memberId,
    memberLevel,
  );

  const activities = allActivities
    .filter((a) => a.level === level)
    .sort((a, b) => a.position - b.position);
  const isPrevious = levelIndex(level) < levelIndex(memberLevel);
  const progressMap = new Map(allProgress.map((p) => [p.activity_id, p]));
  const attemptsByActivity = new Map<string, AttemptRow[]>();
  attempts.forEach((attempt) => {
    const list = attemptsByActivity.get(attempt.activity_id) ?? [];
    list.push(attempt);
    attemptsByActivity.set(attempt.activity_id, list);
  });

  const requiredSteps = activities.filter((a) => a.is_required === 1);
  let activeAssigned = false;

  const steps = activities.map((a) => {
    const progress = progressMap.get(a.id);
    const completed = progress?.status === "completed";
    let status: "completed" | "active" | "locked" | "available";
    if (completed) {
      status = "completed";
    } else if (isPrevious) {
      status = "available";
    } else {
      const earlierIncomplete = requiredSteps.some(
        (r) => r.position < a.position && progressMap.get(r.id)?.status !== "completed",
      );
      if (earlierIncomplete) {
        status = "locked";
      } else if (!activeAssigned) {
        activeAssigned = true;
        status = "active";
      } else {
        status = "locked";
      }
    }

    const rule = resolveRule(a);
    return {
      id: a.id,
      level: a.level,
      title: a.title,
      description: a.description,
      type: a.type,
      instructions: a.instructions,
      content: a.content,
      position: a.position,
      is_required: !!a.is_required,
      link_url: a.link_url ?? null,
      status,
      completed_at: progress?.completed_at ?? null,
      started_at: progress?.started_at ?? null,
      last_started_at: progress?.last_started_at ?? null,
      completion_type: progress?.completion_type ?? null,
      verification_status: progress?.verification_status ?? null,
      evidence: parseJson(progress?.evidence_json ?? null),
      attempts: progress?.attempts ?? 0,
      completion_rule: rule.rule,
      completion_rule_label: ruleLabel(rule.rule),
      repeatable: rule.repeatable,
      passing_score: rule.passingScore,
      quiz_questions: publicQuestions(rule.questions),
      history: (attemptsByActivity.get(a.id) ?? []).map((attempt) => ({
        ...attempt,
        evidence_json: attempt.evidence_json ?? null,
      })),
    };
  });

  const summaries = await buildLevelSummaries(db, memberId, memberLevel);

  return {
    level,
    requested_level: requestedLevel ?? level,
    member_level: memberLevel,
    access_level: memberLevel,
    is_previous_level: isPrevious,
    next_level:
      levelIndex(memberLevel) < LEVELS.length - 1 ? LEVELS[levelIndex(memberLevel) + 1] : null,
    completed_count: steps.filter((s) => s.status === "completed").length,
    total_count: steps.length,
    activities: steps,
    levels: summaries,
  };
}

export async function buildLevelSummaries(
  db: D1Database,
  memberId: string,
  memberLevel: string,
) {
  const accessibleLevels = LEVELS.slice(0, levelIndex(memberLevel) + 1);
  const placeholders = accessibleLevels.map(() => "?").join(", ");
  const [activityCounts, progress] = await Promise.all([
    db
      .prepare(
        `SELECT level, COUNT(*) AS total
         FROM journey_activities
         WHERE level IN (${placeholders}) AND is_published = 1 AND deleted_at IS NULL
         GROUP BY level`,
      )
      .bind(...accessibleLevels)
      .all<{ level: string; total: number }>(),
    db
      .prepare(
        `SELECT a.level, COUNT(*) AS completed
         FROM member_journey_progress p
         JOIN journey_activities a ON a.id = p.activity_id
         WHERE p.member_id = ? AND p.status = 'completed'
           AND a.is_published = 1 AND a.deleted_at IS NULL
         GROUP BY a.level`,
      )
      .bind(memberId)
      .all<{ level: string; completed: number }>(),
  ]);

  const totals = new Map(activityCounts.results.map((r) => [r.level, r.total]));
  const completed = new Map(progress.results.map((r) => [r.level, r.completed]));
  return LEVELS.map((level, index) => ({
    level,
    completed_count: completed.get(level) ?? 0,
    total_count: totals.get(level) ?? 0,
    is_current: level === memberLevel,
    accessible: index <= levelIndex(memberLevel),
  }));
}

export async function maybePromote(
  db: D1Database,
  memberId: string,
  currentLevel: string,
  now: string,
  actorId: string,
) {
  const required = await db
    .prepare(
      "SELECT id FROM journey_activities WHERE level = ? AND is_required = 1 AND is_published = 1 AND deleted_at IS NULL",
    )
    .bind(currentLevel)
    .all<{ id: string }>();
  if (required.results.length === 0) return { promoted: false, newLevel: null };

  const placeholders = required.results.map(() => "?").join(", ");
  const doneCount = await db
    .prepare(
      `SELECT COUNT(*) as count FROM member_journey_progress
       WHERE member_id = ? AND activity_id IN (${placeholders}) AND status = 'completed'`,
    )
    .bind(memberId, ...required.results.map((a) => a.id))
    .first<{ count: number }>();
  if ((doneCount?.count ?? 0) < required.results.length) {
    return { promoted: false, newLevel: null };
  }

  const currentIndex = LEVELS.indexOf(currentLevel);
  if (currentIndex < 0 || currentIndex >= LEVELS.length - 1) {
    return { promoted: false, newLevel: null };
  }
  const newLevel = LEVELS[currentIndex + 1]!;
  await db
    .prepare("UPDATE members SET membership_level = ?, updated_at = ? WHERE id = ?")
    .bind(newLevel, now, memberId)
    .run();
  await db
    .prepare(
      "INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      actorId,
      "promote_member",
      "member",
      memberId,
      JSON.stringify({ from: currentLevel, to: newLevel, via: "journey" }),
      now,
    )
    .run();
  return { promoted: true, newLevel };
}

async function getMember(c: any) {
  const session = getSession(c);
  const member = (await c.env.DB.prepare(
    "SELECT id, membership_level, role FROM members WHERE id = ? AND deleted_at IS NULL",
  )
    .bind(session.member_id)
    .first()) as { id: string; membership_level: string; role: string } | null;
  return { session, member };
}

// ── Member: current journey state (or an accessible previous journey) ────
journeyRouter.get("/", authMiddleware, async (c) => {
  const { session, member } = await getMember(c);
  if (!member) {
    return c.json({ error: "Member not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const requested = c.req.query("level");
  if (
    requested &&
    LEVELS.includes(requested) &&
    levelIndex(requested) > levelIndex(member.membership_level)
  ) {
    return c.json(
      { error: "This journey is not available at your level yet", code: ERROR_CODES.FORBIDDEN },
      403,
    );
  }

  return c.json(
    await buildJourney(
      c.env.DB,
      session.member_id,
      requested && LEVELS.includes(requested) ? requested : member.membership_level,
      member.membership_level,
      requested || undefined,
    ),
  );
});

// ── Member: start / reopen an activity ──────────────────────────────────
journeyRouter.post("/activities/:id/start", authMiddleware, async (c) => {
  const { session, member } = await getMember(c);
  const { id } = c.req.param();
  if (!member) {
    return c.json({ error: "Member not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const activity = await c.env.DB.prepare(
    "SELECT id, level, position FROM journey_activities WHERE id = ? AND is_published = 1 AND deleted_at IS NULL",
  )
    .bind(id)
    .first<{ id: string; level: string; position: number }>();
  if (!activity) {
    return c.json({ error: "Activity not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }
  if (levelIndex(activity.level) > levelIndex(member.membership_level)) {
    return c.json({ error: "This activity is not available yet", code: ERROR_CODES.FORBIDDEN }, 403);
  }

  if (activity.level === member.membership_level) {
    const earlier = await c.env.DB.prepare(
      `SELECT a.id FROM journey_activities a
       WHERE a.level = ? AND a.is_published = 1 AND a.deleted_at IS NULL AND a.is_required = 1
         AND a.position < ?
         AND NOT EXISTS (
           SELECT 1 FROM member_journey_progress p
           WHERE p.member_id = ? AND p.activity_id = a.id AND p.status = 'completed'
         )
       LIMIT 1`,
    )
      .bind(activity.level, activity.position, session.member_id)
      .first();
    if (earlier) {
      return c.json({ error: "Complete the earlier steps first", code: ERROR_CODES.FORBIDDEN }, 403);
    }
  }

  const now = new Date().toISOString();
  const openAttempt = await c.env.DB.prepare(
    `SELECT id FROM member_journey_attempts
     WHERE member_id = ? AND activity_id = ? AND status = 'started'
     ORDER BY started_at DESC LIMIT 1`,
  )
    .bind(session.member_id, id)
    .first<{ id: string }>();

  let attemptId = openAttempt?.id;
  if (!attemptId) {
    attemptId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO member_journey_attempts
       (id, member_id, activity_id, status, verification_status, started_at, created_at)
       VALUES (?, ?, ?, 'started', 'self_reported', ?, ?)`,
    )
      .bind(attemptId, session.member_id, id, now, now)
      .run();
  }

  const progress = await c.env.DB.prepare(
    "SELECT status FROM member_journey_progress WHERE member_id = ? AND activity_id = ?",
  )
    .bind(session.member_id, id)
    .first<{ status: string }>();
  if (!progress) {
    await c.env.DB.prepare(
      `INSERT INTO member_journey_progress
       (id, member_id, activity_id, status, started_at, last_started_at, attempts, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, 'started', ?, ?, 0, 'self_reported', ?, ?)`,
    )
      .bind(crypto.randomUUID(), session.member_id, id, now, now, now, now)
      .run();
  } else {
    await c.env.DB.prepare(
      "UPDATE member_journey_progress SET started_at = COALESCE(started_at, ?), last_started_at = ?, updated_at = ? WHERE member_id = ? AND activity_id = ?",
    )
      .bind(now, now, now, session.member_id, id)
      .run();
  }

  return c.json({ success: true, attempt_id: attemptId, started_at: now });
});

// ── Member: complete an activity (completion rules enforced server-side) ─
journeyRouter.post("/activities/:id/complete", authMiddleware, async (c) => {
  const { session, member } = await getMember(c);
  const { id } = c.req.param();
  const now = new Date().toISOString();
  if (!member) {
    return c.json({ error: "Member not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const activity = await c.env.DB.prepare(
    `SELECT id, level, title, description, type, instructions, position, is_required,
            content, link_url, metadata_json
     FROM journey_activities WHERE id = ? AND is_published = 1 AND deleted_at IS NULL`,
  )
    .bind(id)
    .first<ActivityRow>();
  if (!activity) {
    return c.json({ error: "Activity not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }
  if (levelIndex(activity.level) > levelIndex(member.membership_level)) {
    return c.json({ error: "This activity is not available yet", code: ERROR_CODES.FORBIDDEN }, 403);
  }

  if (activity.level === member.membership_level) {
    const earlier = await c.env.DB.prepare(
      `SELECT a.id FROM journey_activities a
       WHERE a.level = ? AND a.is_published = 1 AND a.deleted_at IS NULL AND a.is_required = 1
         AND a.position < ?
         AND NOT EXISTS (
           SELECT 1 FROM member_journey_progress p
           WHERE p.member_id = ? AND p.activity_id = a.id AND p.status = 'completed'
         )
       LIMIT 1`,
    )
      .bind(activity.level, activity.position, session.member_id)
      .first();
    if (earlier) {
      return c.json({ error: "Complete the earlier steps first", code: ERROR_CODES.FORBIDDEN }, 403);
    }
  }

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM member_journey_progress WHERE member_id = ? AND activity_id = ?",
  )
    .bind(session.member_id, id)
    .first<ProgressRow>();
  const rule = resolveRule(activity);

  if (existing?.status === "completed" && !rule.repeatable) {
    return c.json({
      success: true,
      already_completed: true,
      journey: await buildJourney(c.env.DB, session.member_id, member.membership_level, member.membership_level),
    });
  }

  const evidence = body?.evidence && typeof body.evidence === "object" ? body.evidence : {};
  let completionType: "self_reported" | "system_verified" = "self_reported";
  let verificationStatus: "self_reported" | "pending" | "verified" = "self_reported";

  if (rule.rule === "admin") {
    const openAttempt = await c.env.DB.prepare(
      `SELECT id FROM member_journey_attempts
       WHERE member_id = ? AND activity_id = ? AND status = 'started'
       ORDER BY started_at DESC LIMIT 1`,
    )
      .bind(session.member_id, id)
      .first<{ id: string }>();
    const attemptId = openAttempt?.id ?? crypto.randomUUID();
    if (!openAttempt) {
      await c.env.DB.prepare(
        `INSERT INTO member_journey_attempts
         (id, member_id, activity_id, status, verification_status, started_at, created_at)
         VALUES (?, ?, ?, 'started', 'pending', ?, ?)`,
      )
        .bind(attemptId, session.member_id, id, now, now)
        .run();
    } else {
      await c.env.DB.prepare(
        "UPDATE member_journey_attempts SET verification_status = 'pending' WHERE id = ?",
      )
        .bind(attemptId)
        .run();
    }
    if (!existing) {
      await c.env.DB.prepare(
        `INSERT INTO member_journey_progress
         (id, member_id, activity_id, status, started_at, last_started_at, verification_status, evidence_json, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'started', ?, ?, 'pending', ?, 0, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          session.member_id,
          id,
          now,
          now,
          JSON.stringify({ note: body?.note ?? null }),
          now,
          now,
        )
        .run();
    } else {
      await c.env.DB.prepare(
        "UPDATE member_journey_progress SET verification_status = 'pending', evidence_json = ?, updated_at = ? WHERE member_id = ? AND activity_id = ?",
      )
        .bind(JSON.stringify({ note: body?.note ?? null }), now, session.member_id, id)
        .run();
    }
    return c.json({
      success: true,
      pending_verification: true,
      message: "Submitted for administrator verification",
      journey: await buildJourney(c.env.DB, session.member_id, member.membership_level, member.membership_level),
    });
  }

  if (rule.rule === "acknowledge") {
    if (body?.acknowledgement !== true && evidence?.acknowledged !== true) {
      return c.json(
        {
          error: "Read the activity and confirm you have completed it before marking it done",
          code: ERROR_CODES.VALIDATION_ERROR,
        },
        400,
      );
    }
  } else if (rule.rule === "resource") {
    if (evidence?.opened !== true && evidence?.watched !== true) {
      return c.json(
        {
          error: "Open the linked resource before marking this step complete",
          code: ERROR_CODES.VALIDATION_ERROR,
        },
        400,
      );
    }
  } else if (rule.rule === "activity") {
    if (evidence?.game_completed !== true && evidence?.played !== true) {
      return c.json(
        {
          error: "Complete the activity before marking this step done",
          code: ERROR_CODES.VALIDATION_ERROR,
        },
        400,
      );
    }
  } else if (rule.rule === "quiz") {
    if (rule.questions.length === 0) {
      if (body?.acknowledgement !== true && evidence?.acknowledged !== true) {
        return c.json(
          {
            error: "This assessment has no questions configured yet. Contact an administrator.",
            code: ERROR_CODES.VALIDATION_ERROR,
          },
          400,
        );
      }
    } else {
      const answers = body?.answers;
      if (!answers || typeof answers !== "object") {
        return c.json(
          { error: "Submit your answers to complete the assessment", code: ERROR_CODES.VALIDATION_ERROR },
          400,
        );
      }
      let correct = 0;
      rule.questions.forEach((q: any, index: number) => {
        const submitted = Array.isArray(answers) ? answers[index] : answers[q?.id ?? index];
        if (submitted === q?.correct_index || submitted === q?.correct_answer) correct += 1;
      });
      const score = Math.round((correct / rule.questions.length) * 100);
      if (score < rule.passingScore) {
        return c.json(
          {
            error: `Assessment not passed. You scored ${score}% (pass mark ${rule.passingScore}%).`,
            code: ERROR_CODES.VALIDATION_ERROR,
            score,
            passing_score: rule.passingScore,
          },
          400,
        );
      }
      completionType = "system_verified";
      verificationStatus = "verified";
      evidence.score = score;
      evidence.correct = correct;
      evidence.total = rule.questions.length;
    }
  }

  // A retake must be started explicitly; a repeated click on an already
  // completed repeatable activity never creates a second completion record.
  let attemptId: string | null = null;
  if (existing?.status === "completed" && rule.repeatable) {
    const openAttempt = await c.env.DB.prepare(
      `SELECT id FROM member_journey_attempts
       WHERE member_id = ? AND activity_id = ? AND status = 'started'
       ORDER BY started_at DESC LIMIT 1`,
    )
      .bind(session.member_id, id)
      .first<{ id: string }>();
    if (!openAttempt) {
      return c.json({
        success: true,
        already_completed: true,
        journey: await buildJourney(c.env.DB, session.member_id, member.membership_level, member.membership_level),
      });
    }
    attemptId = openAttempt.id;
  } else {
    const openAttempt = await c.env.DB.prepare(
      `SELECT id FROM member_journey_attempts
       WHERE member_id = ? AND activity_id = ? AND status = 'started'
       ORDER BY started_at DESC LIMIT 1`,
    )
      .bind(session.member_id, id)
      .first<{ id: string }>();
    attemptId = openAttempt?.id ?? crypto.randomUUID();
    if (!openAttempt) {
      await c.env.DB.prepare(
        `INSERT INTO member_journey_attempts
         (id, member_id, activity_id, status, verification_status, started_at, created_at)
         VALUES (?, ?, ?, 'started', ?, ?, ?)`,
      )
        .bind(attemptId, session.member_id, id, verificationStatus, now, now)
        .run();
    }
  }

  await c.env.DB.prepare(
    `UPDATE member_journey_attempts
     SET status = 'completed', completion_type = ?, verification_status = ?, evidence_json = ?,
         completed_at = ?
     WHERE id = ?`,
  )
    .bind(completionType, verificationStatus, JSON.stringify(evidence), now, attemptId)
    .run();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE member_journey_progress
       SET status = 'completed', completed_at = ?, started_at = COALESCE(started_at, ?),
           completion_type = ?, verification_status = ?, evidence_json = ?,
           attempts = COALESCE(attempts, 0) + 1, updated_at = ?
       WHERE member_id = ? AND activity_id = ?`,
    )
      .bind(
        now,
        now,
        completionType,
        verificationStatus,
        JSON.stringify(evidence),
        now,
        session.member_id,
        id,
      )
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO member_journey_progress
       (id, member_id, activity_id, status, started_at, last_started_at, completed_at,
        completion_type, verification_status, evidence_json, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        session.member_id,
        id,
        now,
        now,
        now,
        completionType,
        verificationStatus,
        JSON.stringify(evidence),
        now,
        now,
      )
      .run();
  }

  const promotion =
    activity.level === member.membership_level
      ? await maybePromote(
          c.env.DB,
          session.member_id,
          member.membership_level,
          now,
          session.member_id,
        )
      : { promoted: false, newLevel: null };
  const finalLevel = promotion.newLevel ?? member.membership_level;

  return c.json({
    success: true,
    already_completed: false,
    promoted: promotion.promoted,
    new_level: promotion.newLevel,
    completion_type: completionType,
    verification_status: verificationStatus,
    journey: await buildJourney(c.env.DB, session.member_id, finalLevel, finalLevel),
  });
});
