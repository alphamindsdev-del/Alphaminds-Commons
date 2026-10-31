-- AlphaBody health data (idempotent).
-- Member-owned health profile, private medical records, clinic requests.
-- HID assessments reuse the existing detector_question_sets / detector_responses /
-- detector_results tables (detector_type = 'health_index').

CREATE TABLE IF NOT EXISTS member_health_profiles (
  member_id                TEXT PRIMARY KEY REFERENCES members(id),
  height_cm                REAL,
  weight_kg                REAL,
  blood_type               TEXT,
  allergies                TEXT,
  conditions               TEXT,
  medications              TEXT,
  health_goals             TEXT,
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_health_records (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id    TEXT NOT NULL REFERENCES members(id),
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('lab_result', 'prescription', 'report', 'imaging', 'consultation_note', 'other')),
  notes        TEXT,
  r2_key       TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  recorded_at  TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_health_records_member ON member_health_records(member_id, deleted_at, created_at DESC);

CREATE TABLE IF NOT EXISTS clinic_consultation_requests (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  preferred_date  TEXT,
  preferred_time  TEXT,
  mode            TEXT NOT NULL DEFAULT 'in_person' CHECK (mode IN ('in_person', 'virtual')),
  reason          TEXT NOT NULL,
  contact_phone   TEXT,
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'completed', 'cancelled')),
  admin_notes     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_member ON clinic_consultation_requests(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_status ON clinic_consultation_requests(status, created_at DESC);

-- Default HID lifestyle self-reflection questionnaire.
-- This is a non-clinical wellbeing check-in, not a diagnosis, risk score or
-- lifespan prediction. Administrators can replace it with an approved
-- clinical questionnaire through the Admin → Health Assessment tab.
INSERT OR IGNORE INTO detector_question_sets
  (id, detector_type, version, title, description, questions_json, is_active, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'health_index',
  '1.0',
  'HID Lifestyle Self-Reflection',
  'A short, self-reported snapshot of everyday habits. It is not a medical diagnosis, clinical risk score or lifespan prediction.',
  '[{"id":"sleep","prompt":"In the last week, how often did you get 7 or more hours of sleep?","options":[{"label":"Never","value":0},{"label":"1–2 nights","value":1},{"label":"3–4 nights","value":2},{"label":"5+ nights","value":3}]},{"id":"movement","prompt":"How many days did you move your body for at least 20 minutes?","options":[{"label":"None","value":0},{"label":"1 day","value":1},{"label":"2–3 days","value":2},{"label":"4+ days","value":3}]},{"id":"nutrition","prompt":"How often did you include vegetables or fruit with your meals?","options":[{"label":"Rarely","value":0},{"label":"Some meals","value":1},{"label":"Most days","value":2},{"label":"Almost every meal","value":3}]},{"id":"hydration","prompt":"How often did you drink enough water through the day?","options":[{"label":"Rarely","value":0},{"label":"Sometimes","value":1},{"label":"Most days","value":2},{"label":"Consistently","value":3}]},{"id":"stress","prompt":"How manageable did stress feel this week?","options":[{"label":"Overwhelming","value":0},{"label":"Difficult","value":1},{"label":"Manageable","value":2},{"label":"Very manageable","value":3}]},{"id":"recovery","prompt":"How often did you make time to rest or recover?","options":[{"label":"Never","value":0},{"label":"Rarely","value":1},{"label":"Sometimes","value":2},{"label":"Regularly","value":3}]},{"id":"connection","prompt":"How connected did you feel to people who support you?","options":[{"label":"Isolated","value":0},{"label":"A little","value":1},{"label":"Somewhat","value":2},{"label":"Strongly connected","value":3}]},{"id":"checkins","prompt":"How often did you check in with your body’s signals (energy, pain, hunger)?","options":[{"label":"Never","value":0},{"label":"Rarely","value":1},{"label":"Sometimes","value":2},{"label":"Often","value":3}]}]',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
