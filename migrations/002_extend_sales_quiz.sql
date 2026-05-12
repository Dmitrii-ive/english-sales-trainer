-- Extend quiz with scenario framing + per-option explanations.
-- Extend sales_phrases with keyword list (for partial-match grading in RU→EN mode).

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS scenario     TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_whys  JSONB;

ALTER TABLE sales_phrases  ADD COLUMN IF NOT EXISTS keywords     JSONB;
