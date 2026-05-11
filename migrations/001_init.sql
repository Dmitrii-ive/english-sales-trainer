-- English Sales Trainer — initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- Content tables (one per task type)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_phrases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_en     TEXT NOT NULL,
  text_ru     TEXT NOT NULL,
  context     TEXT,                       -- discovery | demo | objection | closing | other
  category    TEXT,
  meeting_ref TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_en        TEXT NOT NULL,
  word_ru        TEXT NOT NULL,
  example_en     TEXT,
  part_of_speech TEXT,
  meeting_ref    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS speaking_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_en     TEXT NOT NULL,
  text_ru     TEXT,
  meeting_ref TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roleplay_scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation             TEXT NOT NULL,
  customer_line_en      TEXT NOT NULL,
  customer_line_ru      TEXT,
  suggested_response_en TEXT,
  rubric                TEXT,
  meeting_ref           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloze_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_text_en TEXT NOT NULL,
  blanks       JSONB NOT NULL,
  hint_ru      TEXT,
  meeting_ref  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS error_finding_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_with_error    TEXT NOT NULL,
  correct_text       TEXT NOT NULL,
  error_explanation  TEXT,
  meeting_ref        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_topic    TEXT NOT NULL,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,
  correct_index INT  NOT NULL,
  explanation   TEXT,
  meeting_ref   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- Weekly / daily plan
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id  UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  date            DATE NOT NULL UNIQUE,
  focus           TEXT,
  exercises       JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- Progress
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type        TEXT NOT NULL,
  item_id          UUID NOT NULL,
  ease             REAL NOT NULL DEFAULT 2.5,
  interval_days    INT  NOT NULL DEFAULT 0,
  repetitions      INT  NOT NULL DEFAULT 0,
  next_review_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_grade       INT,
  last_reviewed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_next_review ON reviews (next_review_at);

CREATE TABLE IF NOT EXISTS attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type     TEXT NOT NULL,
  item_id       UUID NOT NULL,
  exercise_type TEXT,
  correct       BOOLEAN,
  score         REAL,
  user_answer   TEXT,
  feedback      TEXT,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_date ON attempts (attempted_at);

CREATE TABLE IF NOT EXISTS daily_progress (
  date              DATE PRIMARY KEY,
  exercises_done    INT  NOT NULL DEFAULT 0,
  exercises_planned INT  NOT NULL DEFAULT 0,
  minutes_spent     INT  NOT NULL DEFAULT 0,
  accuracy_pct      REAL,
  vocab_score       REAL,
  grammar_score     REAL,
  fluency_score     REAL,
  goal_met          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS streak (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_streak      INT NOT NULL DEFAULT 0,
  longest_streak      INT NOT NULL DEFAULT 0,
  last_activity_date  DATE
);

INSERT INTO streak (id) VALUES (1) ON CONFLICT DO NOTHING;
