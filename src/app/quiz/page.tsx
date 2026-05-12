import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { QuizRunner } from "@/components/QuizRunner";
import type { QuizQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  const sp = await searchParams;
  const ids = sp.ids
    ? sp.ids.split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    : [];

  let rows: QuizQuestion[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<QuizQuestion>`
      SELECT id, quiz_topic, question, options, correct_index, explanation, meeting_ref
      FROM quiz_questions WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as QuizQuestion[];
  } else {
    const r = await sql<QuizQuestion>`
      SELECT id, quiz_topic, question, options, correct_index, explanation, meeting_ref
      FROM quiz_questions ORDER BY created_at DESC LIMIT 15`;
    rows = r.rows;
  }

  return <QuizRunner items={rows} />;
}
