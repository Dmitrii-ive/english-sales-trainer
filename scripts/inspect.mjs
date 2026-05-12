#!/usr/bin/env node
// Print recent tracking state — streak, daily progress, reviews, attempts.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL not set");
  process.exit(1);
}

const c = new Client({ connectionString: url });
await c.connect();

const today = new Date().toISOString().slice(0, 10);
console.log(`# Tracking check — ${new Date().toISOString()}\n`);

// Streak
const s = await c.query("SELECT current_streak, longest_streak, last_activity_date FROM streak WHERE id = 1");
console.log("## Streak");
console.table(s.rows);

// Today's daily_progress
const dp = await c.query(
  "SELECT date, exercises_done, exercises_planned, minutes_spent, accuracy_pct, goal_met FROM daily_progress ORDER BY date DESC LIMIT 7",
);
console.log("\n## daily_progress (last 7 days)");
console.table(dp.rows);

// Counts overall
const counts = await c.query(`
  SELECT
    (SELECT COUNT(*) FROM attempts)                 AS attempts_total,
    (SELECT COUNT(*) FROM reviews)                  AS reviews_total,
    (SELECT COUNT(*) FROM attempts WHERE attempted_at::date = $1)  AS attempts_today,
    (SELECT COUNT(*) FROM attempts WHERE correct IS TRUE)          AS correct_total,
    (SELECT COUNT(*) FROM attempts WHERE correct IS FALSE)         AS incorrect_total,
    (SELECT COUNT(*) FROM attempts WHERE correct IS NULL)          AS no_correctness_total
`, [today]);
console.log("\n## Totals");
console.table(counts.rows);

// Attempts breakdown by exercise_type
const byEx = await c.query(`
  SELECT exercise_type,
         COUNT(*)::int AS n,
         SUM(CASE WHEN correct IS TRUE  THEN 1 ELSE 0 END)::int AS ok,
         SUM(CASE WHEN correct IS FALSE THEN 1 ELSE 0 END)::int AS fail,
         SUM(CASE WHEN correct IS NULL  THEN 1 ELSE 0 END)::int AS no_corr
  FROM attempts
  GROUP BY exercise_type
  ORDER BY n DESC`);
console.log("\n## Attempts by exercise_type");
console.table(byEx.rows);

// Reviews breakdown by item_type
const byType = await c.query(`
  SELECT item_type,
         COUNT(*)::int AS items_seen,
         ROUND(AVG(ease)::numeric, 2) AS avg_ease,
         ROUND(AVG(interval_days)::numeric, 1) AS avg_interval_days,
         SUM(CASE WHEN next_review_at <= now() THEN 1 ELSE 0 END)::int AS due_now
  FROM reviews
  GROUP BY item_type
  ORDER BY items_seen DESC`);
console.log("\n## SM-2 state by item_type");
console.table(byType.rows);

// Last 15 attempts
const lastA = await c.query(`
  SELECT
    to_char(attempted_at, 'HH24:MI:SS') AS at,
    item_type,
    exercise_type,
    correct,
    score,
    LEFT(COALESCE(user_answer, ''), 40) AS answer,
    LEFT(COALESCE(feedback, ''), 30)    AS feedback
  FROM attempts
  ORDER BY attempted_at DESC
  LIMIT 15`);
console.log("\n## Last 15 attempts");
console.table(lastA.rows);

// Last 10 reviews (most recently updated SR state)
const lastR = await c.query(`
  SELECT
    to_char(last_reviewed_at, 'HH24:MI:SS') AS at,
    item_type,
    last_grade,
    ROUND(ease::numeric, 2)  AS ease,
    interval_days            AS days,
    repetitions              AS reps,
    to_char(next_review_at, 'YYYY-MM-DD') AS next
  FROM reviews
  WHERE last_reviewed_at IS NOT NULL
  ORDER BY last_reviewed_at DESC
  LIMIT 10`);
console.log("\n## Last 10 review state updates");
console.table(lastR.rows);

await c.end();
