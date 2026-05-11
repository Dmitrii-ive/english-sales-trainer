import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { nextReview } from "@/lib/sr";
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

  // Load current SR state for this item (if any)
  const current = await sql<{
    ease: number;
    interval_days: number;
    repetitions: number;
  }>`
    SELECT ease, interval_days, repetitions
    FROM reviews
    WHERE item_type = ${itemType} AND item_id = ${b.item_id}
    LIMIT 1`;

  const prev = current.rows[0] ?? { ease: 2.5, interval_days: 0, repetitions: 0 };
  const next = nextReview(prev, grade);

  await sql`
    INSERT INTO reviews (item_type, item_id, ease, interval_days, repetitions, next_review_at, last_grade, last_reviewed_at)
    VALUES (${itemType}, ${b.item_id}, ${next.ease}, ${next.interval_days}, ${next.repetitions}, ${next.next_review_at.toISOString()}, ${grade}, ${new Date().toISOString()})
    ON CONFLICT (item_type, item_id) DO UPDATE SET
      ease             = EXCLUDED.ease,
      interval_days    = EXCLUDED.interval_days,
      repetitions      = EXCLUDED.repetitions,
      next_review_at   = EXCLUDED.next_review_at,
      last_grade       = EXCLUDED.last_grade,
      last_reviewed_at = EXCLUDED.last_reviewed_at`;

  await sql`
    INSERT INTO attempts (item_type, item_id, exercise_type, correct, score, user_answer, feedback)
    VALUES (${itemType}, ${b.item_id}, ${b.exercise_type ?? null}, ${b.correct ?? null}, ${b.score ?? null}, ${b.user_answer ?? null}, ${b.feedback ?? null})`;

  return NextResponse.json({
    ok: true,
    next_review_at: next.next_review_at.toISOString(),
    interval_days: next.interval_days,
  });
}
