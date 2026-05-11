import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import type { DailyExercise, DailyPlan } from "@/lib/types";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = todayISO();
  const r = await sql<{
    id: string;
    date: string;
    day_of_week: number;
    focus: string | null;
    exercises: DailyExercise[];
  }>`
    SELECT id, date::text, day_of_week, focus, exercises
    FROM daily_plans
    WHERE date = ${date}
    LIMIT 1`;

  if (r.rows.length === 0) {
    return NextResponse.json<{ plan: DailyPlan | null }>({ plan: null });
  }

  const plan = r.rows[0] as DailyPlan;
  return NextResponse.json({ plan });
}
