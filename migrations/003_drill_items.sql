-- Grammar drill: single-blank sentence + 3-way multiple choice.

CREATE TABLE IF NOT EXISTS drill_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,                -- e.g. "3rd person -s + Articles"
  subtopic      TEXT,
  sentence      TEXT NOT NULL,                -- "Our agent ___ leads based on visitor data."
  options       JSONB NOT NULL,               -- ["qualify", "qualifies", "qualifying"]
  correct_index INT  NOT NULL,
  explanation   TEXT,
  meeting_ref   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
