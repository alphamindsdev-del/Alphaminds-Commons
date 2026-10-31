import { Hono } from "hono";
import { Env, SessionPayload } from "../../../shared/types.js";
import { ERROR_CODES } from "../../../shared/constants.js";
import { authMiddleware, getSession } from "../middleware/auth.js";
import {
  CreateClinicRequestSchema,
  CreateClinicRequestInput,
  CreateHealthRecordSchema,
  CreateHealthRecordInput,
  HealthProfileSchema,
  HealthProfileInput,
  SubmitHealthAssessmentSchema,
  SubmitHealthAssessmentInput,
} from "../lib/validation.js";

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.use("*", authMiddleware as any);

const MAX_RECORD_BYTES = 20 * 1024 * 1024;

const ALLOWED_RECORD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: Array<{ label: string; value: number }>;
}

function parseQuestions(raw: string): AssessmentQuestion[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Question set is empty or malformed");
  }
  return parsed.map((question: any, index: number) => {
    if (!question || typeof question !== "object") {
      throw new Error(`Question ${index + 1} is malformed`);
    }
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length < 2) {
      throw new Error(`Question ${index + 1} needs at least two options`);
    }
    return {
      id: String(question.id ?? `q${index + 1}`),
      prompt: String(question.prompt ?? ""),
      options: options.map((option: any) => ({
        label: String(option?.label ?? ""),
        value: Number(option?.value ?? 0),
      })),
    };
  });
}

function assessmentBand(score: number): { label: string; message: string } {
  if (score >= 80) {
    return {
      label: "Strong foundations",
      message:
        "Your self-reported habits look well balanced right now. Keep the routines that are working for you.",
    };
  }
  if (score >= 60) {
    return {
      label: "Building steadily",
      message:
        "There is a solid base here. Choose one area to strengthen this week and keep the rest steady.",
    };
  }
  if (score >= 40) {
    return {
      label: "Room to recover",
      message:
        "A few areas may need more support. Start with sleep, movement or recovery and be gentle with yourself.",
    };
  }
  return {
    label: "Time to check in",
    message:
      "This snapshot suggests several areas need attention. Consider speaking with a qualified health professional.",
  };
}

healthRouter.get("/profile", async (c) => {
  const session = getSession(c as any);
  const profile = await c.env.DB.prepare(
    "SELECT * FROM member_health_profiles WHERE member_id = ?",
  )
    .bind(session.member_id)
    .first();
  const member = await c.env.DB.prepare(
    "SELECT age, gender FROM members WHERE id = ? AND deleted_at IS NULL",
  )
    .bind(session.member_id)
    .first<{ age: number | null; gender: string | null }>();
  return c.json({ profile: profile ?? null, member: member ?? null });
});

healthRouter.put("/profile", async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = HealthProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsed.error.flatten(),
      },
      400,
    );
  }
  const input = parsed.data as HealthProfileInput;
  const now = new Date().toISOString();

  const fields = [
    "height_cm",
    "weight_kg",
    "blood_type",
    "allergies",
    "conditions",
    "medications",
    "health_goals",
    "emergency_contact_name",
    "emergency_contact_phone",
  ] as const;

  const values = fields.map((field) => (input[field] === undefined ? null : input[field]));
  const existing = await c.env.DB.prepare(
    "SELECT member_id FROM member_health_profiles WHERE member_id = ?",
  )
    .bind(session.member_id)
    .first<{ member_id: string }>();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE member_health_profiles SET
        height_cm = ?, weight_kg = ?, blood_type = ?, allergies = ?, conditions = ?,
        medications = ?, health_goals = ?, emergency_contact_name = ?,
        emergency_contact_phone = ?, updated_at = ?
       WHERE member_id = ?`,
    )
      .bind(...values, now, session.member_id)
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO member_health_profiles
        (member_id, height_cm, weight_kg, blood_type, allergies, conditions, medications,
         health_goals, emergency_contact_name, emergency_contact_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(session.member_id, ...values, now, now)
      .run();
  }

  const profile = await c.env.DB.prepare(
    "SELECT * FROM member_health_profiles WHERE member_id = ?",
  )
    .bind(session.member_id)
    .first();
  return c.json({ profile });
});

healthRouter.get("/records", async (c) => {
  const session = getSession(c as any);
  const result = await c.env.DB.prepare(
    `SELECT id, title, category, notes, file_name, mime_type, size_bytes, recorded_at, created_at
     FROM member_health_records
     WHERE member_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
  )
    .bind(session.member_id)
    .all();
  const data = result.results.map((record: any) => ({
    ...record,
    file_url: `/v1/health/records/${record.id}/file`,
  }));
  return c.json({ data });
});

healthRouter.post("/records", async (c) => {
  const session = getSession(c as any);
  const formData = await c.req.parseBody();
  const file = formData["file"] as File | null;

  if (!file) {
    return c.json({ error: "No file provided", code: ERROR_CODES.VALIDATION_ERROR }, 400);
  }
  if (!ALLOWED_RECORD_TYPES.includes(file.type as any)) {
    return c.json(
      {
        error: "Unsupported file type. Use PDF, an image, Word or plain text.",
        code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
      },
      415,
    );
  }
  if (file.size > MAX_RECORD_BYTES) {
    return c.json({ error: "File too large (max 20MB)", code: ERROR_CODES.FILE_TOO_LARGE }, 413);
  }

  const parsed = CreateHealthRecordSchema.safeParse({
    title: formData["title"],
    category: formData["category"],
    notes: formData["notes"] || undefined,
    recorded_at: formData["recorded_at"] || undefined,
  });
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsed.error.flatten(),
      },
      400,
    );
  }
  const input = parsed.data as CreateHealthRecordInput;
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const key = `members/${session.member_id}/health-records/${crypto.randomUUID()}.${ext}`;

  await c.env.MEDIA_BUCKET.put(key, file.stream() as any, {
    httpMetadata: { contentType: file.type },
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO member_health_records
      (id, member_id, title, category, notes, r2_key, file_name, mime_type, size_bytes, recorded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      session.member_id,
      input.title,
      input.category,
      input.notes ?? null,
      key,
      file.name,
      file.type,
      file.size,
      input.recorded_at ?? null,
      now,
      now,
    )
    .run();

  const record = await c.env.DB.prepare(
    `SELECT id, title, category, notes, file_name, mime_type, size_bytes, recorded_at, created_at
     FROM member_health_records WHERE id = ?`,
  )
    .bind(id)
    .first();

  return c.json({ record: { ...(record as any), file_url: `/v1/health/records/${id}/file` } }, 201);
});

healthRouter.get("/records/:id/file", async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const record = await c.env.DB.prepare(
    `SELECT r2_key, file_name, mime_type
     FROM member_health_records
     WHERE id = ? AND member_id = ? AND deleted_at IS NULL`,
  )
    .bind(id, session.member_id)
    .first<{ r2_key: string; file_name: string; mime_type: string }>();

  if (!record) {
    return c.json({ error: "Record not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const object = await c.env.MEDIA_BUCKET.get(record.r2_key);
  if (!object) {
    return c.json({ error: "File not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", record.mime_type || "application/octet-stream");
  headers.set("Content-Disposition", `inline; filename="${record.file_name.replace(/"/g, "")}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

healthRouter.delete("/records/:id", async (c) => {
  const session = getSession(c as any);
  const { id } = c.req.param();
  const record = await c.env.DB.prepare(
    "SELECT r2_key FROM member_health_records WHERE id = ? AND member_id = ? AND deleted_at IS NULL",
  )
    .bind(id, session.member_id)
    .first<{ r2_key: string }>();

  if (!record) {
    return c.json({ error: "Record not found", code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    "UPDATE member_health_records SET deleted_at = ?, updated_at = ? WHERE id = ? AND member_id = ?",
  )
    .bind(now, now, id, session.member_id)
    .run();

  try {
    await c.env.MEDIA_BUCKET.delete(record.r2_key);
  } catch {
    // The row is already hidden; an orphaned object is not exposed to the member.
  }

  return c.json({ success: true });
});

healthRouter.get("/clinic/requests", async (c) => {
  const session = getSession(c as any);
  const result = await c.env.DB.prepare(
    `SELECT id, preferred_date, preferred_time, mode, reason, contact_phone, status, admin_notes, created_at, updated_at
     FROM clinic_consultation_requests
     WHERE member_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
  )
    .bind(session.member_id)
    .all();
  return c.json({ data: result.results });
});

healthRouter.post("/clinic/requests", async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = CreateClinicRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsed.error.flatten(),
      },
      400,
    );
  }
  const input = parsed.data as CreateClinicRequestInput;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO clinic_consultation_requests
      (id, member_id, preferred_date, preferred_time, mode, reason, contact_phone, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)`,
  )
    .bind(
      id,
      session.member_id,
      input.preferred_date ?? null,
      input.preferred_time ?? null,
      input.mode,
      input.reason,
      input.contact_phone ?? null,
      now,
      now,
    )
    .run();

  const request = await c.env.DB.prepare(
    "SELECT * FROM clinic_consultation_requests WHERE id = ?",
  )
    .bind(id)
    .first();
  return c.json({ request }, 201);
});

healthRouter.get("/assessment", async (c) => {
  const session = getSession(c as any);
  const questionSet = await c.env.DB.prepare(
    `SELECT id, version, title, description, questions_json, created_at
     FROM detector_question_sets
     WHERE detector_type = 'health_index' AND is_active = 1
     ORDER BY created_at DESC LIMIT 1`,
  ).first<any>();

  const latest = await c.env.DB.prepare(
    `SELECT id, result_summary_json, created_at
     FROM detector_results
     WHERE member_id = ? AND detector_type = 'health_index'
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(session.member_id)
    .first<any>();

  if (!questionSet) {
    return c.json({ available: false, latest_result: latest ? parseResult(latest) : null });
  }

  let questions: AssessmentQuestion[] = [];
  try {
    questions = parseQuestions(questionSet.questions_json);
  } catch {
    return c.json({ available: false, latest_result: latest ? parseResult(latest) : null });
  }

  return c.json({
    available: true,
    question_set: {
      id: questionSet.id,
      version: questionSet.version,
      title: questionSet.title,
      description: questionSet.description,
      questions,
    },
    latest_result: latest ? parseResult(latest) : null,
    disclaimer:
      "This is a self-reported wellbeing snapshot. It is not a medical diagnosis, clinical risk score or lifespan prediction.",
  });
});

healthRouter.get("/assessment/history", async (c) => {
  const session = getSession(c as any);
  const result = await c.env.DB.prepare(
    `SELECT id, result_summary_json, created_at
     FROM detector_results
     WHERE member_id = ? AND detector_type = 'health_index'
     ORDER BY created_at DESC LIMIT 20`,
  )
    .bind(session.member_id)
    .all();
  return c.json({ data: result.results.map(parseResult) });
});

healthRouter.post("/assessment/submit", async (c) => {
  const session = getSession(c as any);
  const body = await c.req.json();
  const parsed = SubmitHealthAssessmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        code: ERROR_CODES.VALIDATION_ERROR,
        details: parsed.error.flatten(),
      },
      400,
    );
  }
  const input = parsed.data as SubmitHealthAssessmentInput;

  const questionSet = await c.env.DB.prepare(
    `SELECT id, version, title, questions_json
     FROM detector_question_sets
     WHERE id = ? AND detector_type = 'health_index' AND is_active = 1`,
  )
    .bind(input.question_set_id)
    .first<any>();

  if (!questionSet) {
    return c.json(
      { error: "Assessment not found or no longer available", code: ERROR_CODES.NOT_FOUND },
      404,
    );
  }

  let questions: AssessmentQuestion[];
  try {
    questions = parseQuestions(questionSet.questions_json);
  } catch {
    return c.json(
      { error: "Assessment is not configured correctly", code: ERROR_CODES.VALIDATION_ERROR },
      400,
    );
  }

  let total = 0;
  let minimum = 0;
  let maximum = 0;
  const cleanAnswers: Record<string, number> = {};

  for (const question of questions) {
    const rawAnswer = input.answers[question.id];
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
      return c.json(
        {
          error: `Please answer: ${question.prompt}`,
          code: ERROR_CODES.VALIDATION_ERROR,
        },
        400,
      );
    }
    const value = Number(rawAnswer);
    if (!question.options.some((option) => option.value === value)) {
      return c.json(
        { error: `Invalid answer for: ${question.prompt}`, code: ERROR_CODES.VALIDATION_ERROR },
        400,
      );
    }
    const values = question.options.map((option) => option.value);
    total += value;
    minimum += Math.min(...values);
    maximum += Math.max(...values);
    cleanAnswers[question.id] = value;
  }

  const score =
    maximum > minimum ? Math.round(((total - minimum) / (maximum - minimum)) * 100) : 0;
  const band = assessmentBand(score);
  const now = new Date().toISOString();
  const responseId = crypto.randomUUID();
  const resultId = crypto.randomUUID();

  const summary = {
    score,
    band: band.label,
    message: band.message,
    answered: questions.length,
    total_questions: questions.length,
    completed_at: now,
    question_set_version: questionSet.version,
  };

  await c.env.DB.prepare(
    `INSERT INTO detector_responses
      (id, member_id, question_set_id, detector_type, status, responses_json, started_at, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, 'health_index', 'completed', ?, ?, ?, ?, ?)`,
  )
    .bind(
      responseId,
      session.member_id,
      questionSet.id,
      JSON.stringify(cleanAnswers),
      now,
      now,
      now,
      now,
    )
    .run();

  await c.env.DB.prepare(
    `INSERT INTO detector_results
      (id, member_id, response_id, detector_type, question_set_id, question_set_version, result_summary_json, result_full_json, created_at, updated_at)
     VALUES (?, ?, ?, 'health_index', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      resultId,
      session.member_id,
      responseId,
      questionSet.id,
      questionSet.version,
      JSON.stringify(summary),
      JSON.stringify({ answers: cleanAnswers }),
      now,
      now,
    )
    .run();

  await c.env.DB.prepare(
    "UPDATE member_stats SET detectors_completed = detectors_completed + 1, updated_at = ? WHERE member_id = ?",
  )
    .bind(now, session.member_id)
    .run();

  return c.json({
    result: { id: resultId, ...summary },
    disclaimer:
      "This is a self-reported wellbeing snapshot. It is not a medical diagnosis, clinical risk score or lifespan prediction.",
  });
});

function parseResult(row: any) {
  let summary: any = {};
  try {
    summary = JSON.parse(row.result_summary_json ?? "{}");
  } catch {
    summary = {};
  }
  return {
    id: row.id,
    ...summary,
    created_at: row.created_at,
  };
}
