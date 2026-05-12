import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { todayISO } from "@/lib/utils";
import { easeToScore } from "@/lib/scores";
import { HomeView } from "@/components/HomeView";
import type { DailyExercise, DailyPlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isAuthenticated())) redirect("/login");

  const date = todayISO();

  const [planRes, streakRes, scoresRes] = await Promise.all([
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
      vocab_ease: number | null;
      grammar_ease: number | null;
      fluency_ease: number | null;
    }>`SELECT
         AVG(CASE WHEN item_type = 'vocabulary' THEN ease END)::real AS vocab_ease,
         AVG(CASE WHEN item_type IN ('cloze','error_finding') THEN ease END)::real AS grammar_ease,
         AVG(CASE WHEN item_type IN ('sales_phrase','speaking','roleplay','quiz') THEN ease END)::real AS fluency_ease
       FROM reviews
       WHERE last_reviewed_at >= now() - INTERVAL '30 days'`,
  ]);

  const plan: DailyPlan | null = planRes.rows[0]
    ? (planRes.rows[0] as DailyPlan)
    : null;
  const streak = streakRes.rows[0]?.current_streak ?? 0;
  const s = scoresRes.rows[0];

  return (
    <HomeView
      plan={plan}
      streak={streak}
      scores={{
        vocab: easeToScore(s?.vocab_ease),
        grammar: easeToScore(s?.grammar_ease),
        fluency: easeToScore(s?.fluency_ease),
      }}
    />
  );
}
