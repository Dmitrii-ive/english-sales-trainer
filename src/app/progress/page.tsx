import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { todayISO } from "@/lib/utils";
import { easeToScore } from "@/lib/scores";
import { ProgressView, type ProgressData } from "@/components/ProgressView";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  if (!(await isAuthenticated())) redirect("/login");

  const today = todayISO();

  const [streakRes, todayRes, scoresRes, totalsRes, dueRes, historyRes] =
    await Promise.all([
      sql<{ current_streak: number; longest_streak: number }>`
        SELECT current_streak, longest_streak FROM streak WHERE id = 1`,
      sql<{ exercises_done: number; accuracy_pct: number | null }>`
        SELECT exercises_done, accuracy_pct FROM daily_progress WHERE date = ${today}`,
      sql<{
        vocab_ease: number | null;
        grammar_ease: number | null;
        fluency_ease: number | null;
      }>`SELECT
           AVG(CASE WHEN item_type = 'vocabulary' THEN ease END)::real AS vocab_ease,
           AVG(CASE WHEN item_type IN ('cloze','error_finding','drill') THEN ease END)::real AS grammar_ease,
           AVG(CASE WHEN item_type IN ('sales_phrase','speaking','roleplay','quiz') THEN ease END)::real AS fluency_ease
         FROM reviews
         WHERE last_reviewed_at >= now() - INTERVAL '30 days'`,
      sql<{
        sales_phrase: number;
        vocabulary: number;
        speaking: number;
        roleplay: number;
        cloze: number;
        error_finding: number;
        quiz: number;
        drill: number;
      }>`SELECT
           (SELECT COUNT(*)::int FROM sales_phrases)        AS sales_phrase,
           (SELECT COUNT(*)::int FROM vocabulary)           AS vocabulary,
           (SELECT COUNT(*)::int FROM speaking_items)       AS speaking,
           (SELECT COUNT(*)::int FROM roleplay_scenarios)   AS roleplay,
           (SELECT COUNT(*)::int FROM cloze_items)          AS cloze,
           (SELECT COUNT(*)::int FROM error_finding_items)  AS error_finding,
           (SELECT COUNT(*)::int FROM quiz_questions)       AS quiz,
           (SELECT COUNT(*)::int FROM drill_items)          AS drill`,
      sql<{ n: number }>`
        SELECT COUNT(*)::int AS n FROM reviews WHERE next_review_at::date <= ${today}`,
      sql<{ date: string; exercises: number; accuracy: number | null }>`
        SELECT date::text AS date, exercises_done AS exercises, accuracy_pct AS accuracy
        FROM daily_progress
        WHERE date >= ${today}::date - INTERVAL '13 days'
        ORDER BY date ASC`,
    ]);

  const s = scoresRes.rows[0];
  const totals = totalsRes.rows[0];

  // Pad history to last 14 days
  const padded: ProgressData["history"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = historyRes.rows.find((r) => r.date === key);
    padded.push({
      date: key,
      exercises: found?.exercises ?? 0,
      accuracy: found?.accuracy ?? null,
    });
  }

  const data: ProgressData = {
    streak: {
      current: streakRes.rows[0]?.current_streak ?? 0,
      longest: streakRes.rows[0]?.longest_streak ?? 0,
    },
    today: {
      exercises: todayRes.rows[0]?.exercises_done ?? 0,
      accuracy: todayRes.rows[0]?.accuracy_pct ?? null,
    },
    scores: {
      vocab: easeToScore(s?.vocab_ease),
      grammar: easeToScore(s?.grammar_ease),
      fluency: easeToScore(s?.fluency_ease),
    },
    totals: totals ?? {
      sales_phrase: 0,
      vocabulary: 0,
      speaking: 0,
      roleplay: 0,
      cloze: 0,
      error_finding: 0,
      quiz: 0,
      drill: 0,
    },
    due_today: dueRes.rows[0]?.n ?? 0,
    history: padded,
  };

  return <ProgressView data={data} />;
}
