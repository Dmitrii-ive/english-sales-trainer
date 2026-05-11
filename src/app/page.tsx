import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { todayISO } from "@/lib/utils";
import { HomeView } from "@/components/HomeView";
import type { DailyExercise, DailyPlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isAuthenticated())) redirect("/login");

  const date = todayISO();

  const [planRes, streakRes, progressRes] = await Promise.all([
    sql<{
      id: string;
      date: string;
      day_of_week: number;
      focus: string | null;
      exercises: DailyExercise[];
    }>`SELECT id, date::text, day_of_week, focus, exercises
       FROM daily_plans WHERE date = ${date} LIMIT 1`,
    sql<{ current_streak: number }>`SELECT current_streak FROM streak WHERE id = 1`,
    sql<{
      vocab_score: number | null;
      grammar_score: number | null;
      fluency_score: number | null;
    }>`SELECT vocab_score, grammar_score, fluency_score
       FROM daily_progress ORDER BY date DESC LIMIT 1`,
  ]);

  const plan: DailyPlan | null = planRes.rows[0]
    ? (planRes.rows[0] as DailyPlan)
    : null;
  const streak = streakRes.rows[0]?.current_streak ?? 0;
  const p = progressRes.rows[0] ?? {
    vocab_score: 0,
    grammar_score: 0,
    fluency_score: 0,
  };

  return (
    <HomeView
      plan={plan}
      streak={streak}
      scores={{
        vocab: p.vocab_score ?? 0,
        grammar: p.grammar_score ?? 0,
        fluency: p.fluency_score ?? 0,
      }}
    />
  );
}
