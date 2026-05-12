import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { nextReview } from "@/lib/sr";
import { todayISO } from "@/lib/utils";
import type { Grade, ItemType } from "@/lib/types";

const Body = z.object({
  item_type: z.enum([
    "sales_phrase",
    "vocabulary",
    "speaking",
    "roleplay",
    "cloze",
    "error_finding",
    "quiz",
  ]),
  item_id: z.string().uuid(),
  grade: z.number().int().min(0).max(5),
  exercise_type: z.string().optional(),
  correct: z.boolean().optional(),
  score: z.number().optional(),
  user_answer: z.string().optional(),
  feedback: z.string().optional(),
});

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const b = parsed.data;
  const itemType = b.item_type as ItemType;
  const grade = b.grade as Grade;
  const today = todayISO();
  const nowIso = new Date().toISOString();

  // Load current SR state
  const current = await sql<{
    ease: number;
    interval_days: number;
    repetitions: number;
  }>`SELECT ease, interval_days, repetitions FROM reviews
     WHERE item_type = ${itemType} AND item_id = ${b.item_id} LIMIT 1`;

  const prev = current.rows[0] ?? { ease: 2.5, interval_days: 0, repetitions: 0 };
  const next = nextReview(prev, grade);

  // Upsert SR state
  await sql`
    INSERT INTO reviews (item_type, item_id, ease, interval_days, repetitions, next_review_at, last_grade, last_reviewed_at)
    VALUES (${itemType}, ${b.item_id}, ${next.ease}, ${next.interval_days}, ${next.repetitions}, ${next.next_review_at.toISOString()}, ${grade}, ${nowIso})
    ON CONFLICT (item_type, item_id) DO UPDATE SET
      ease             = EXCLUDED.ease,
      interval_days    = EXCLUDED.interval_days,
      repetitions      = EXCLUDED.repetitions,
      next_review_at   = EXCLUDED.next_review_at,
      last_grade       = EXCLUDED.last_grade,
      last_reviewed_at = EXCLUDED.last_reviewed_at`;

  // Log attempt
  await sql`
    INSERT INTO attempts (item_type, item_id, exercise_type, correct, score, user_answer, feedback)
    VALUES (${itemType}, ${b.item_id}, ${b.exercise_type ?? null}, ${b.correct ?? null}, ${b.score ?? null}, ${b.user_answer ?? null}, ${b.feedback ?? null})`;

  // Update streak
  const s = await sql<{
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
  }>`SELECT current_streak, longest_streak, last_activity_date::text FROM streak WHERE id = 1`;
  const sr = s.rows[0];
  let cur = sr?.current_streak ?? 0;
  let longest = sr?.longest_streak ?? 0;
  if (sr?.last_activity_date !== today) {
    if (sr?.last_activity_date) {
      const last = new Date(sr.last_activity_date);
      const t = new Date(today);
      const diffDays = Math.round(
        (t.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      cur = diffDays === 1 ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    if (cur > longest) longest = cur;
    await sql`
      UPDATE streak
      SET current_streak = ${cur}, longest_streak = ${longest}, last_activity_date = ${today}
      WHERE id = 1`;
  }

  // Update daily_progress (exercises_done + accuracy snapshot)
  await sql`
    INSERT INTO daily_progress (date, exercises_done)
    VALUES (${today}, 1)
    ON CONFLICT (date) DO UPDATE SET
      exercises_done = daily_progress.exercises_done + 1`;

  // Recompute today's accuracy from attempts
  const acc = await sql<{ pct: number | null }>`
    SELECT (AVG(CASE WHEN correct IS TRUE THEN 1 WHEN correct IS FALSE THEN 0 END) * 100)::real AS pct
    FROM attempts
    WHERE attempted_at::date = ${today} AND correct IS NOT NULL`;
  await sql`UPDATE daily_progress SET accuracy_pct = ${acc.rows[0]?.pct ?? null} WHERE date = ${today}`;

  return NextResponse.json({
    ok: true,
    next_review_at: next.next_review_at.toISOString(),
    interval_days: next.interval_days,
    streak: cur,
  });
}
