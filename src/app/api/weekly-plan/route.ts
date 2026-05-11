import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

const Exercise = z.object({
  type: z.enum([
    "sales_phrase",
    "vocabulary",
    "speaking",
    "roleplay",
    "cloze",
    "error_finding",
    "quiz",
  ]),
  mode: z
    .enum(["audio_repeat", "ru_en", "flip", "speaking", "roleplay", "cloze", "error_finding", "quiz"])
    .optional(),
  item_ids: z.array(z.string().uuid()).min(1),
});

const DayPlan = z.object({
  day_of_week: z.number().int().min(0).max(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus: z.string().optional(),
  exercises: z.array(Exercise).min(1),
});

const Body = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().optional(),
  days: z.array(DayPlan).min(1).max(7),
});

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
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

  const { week_start, summary, days } = parsed.data;

  const weekRow = await sql<{ id: string }>`
    INSERT INTO weekly_plans (week_start, summary)
    VALUES (${week_start}, ${summary ?? null})
    ON CONFLICT (week_start) DO UPDATE SET summary = EXCLUDED.summary
    RETURNING id`;
  const weekId = weekRow.rows[0].id;

  for (const d of days) {
    await sql`
      INSERT INTO daily_plans (weekly_plan_id, day_of_week, date, focus, exercises)
      VALUES (${weekId}, ${d.day_of_week}, ${d.date}, ${d.focus ?? null}, ${JSON.stringify(d.exercises)}::jsonb)
      ON CONFLICT (date) DO UPDATE SET
        weekly_plan_id = EXCLUDED.weekly_plan_id,
        day_of_week    = EXCLUDED.day_of_week,
        focus          = EXCLUDED.focus,
        exercises      = EXCLUDED.exercises`;
  }

  return NextResponse.json({ ok: true, weekly_plan_id: weekId });
}
