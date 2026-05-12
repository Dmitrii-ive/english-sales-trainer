import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { PhraseRunner } from "@/components/PhraseRunner";
import type { SalesPhrase } from "@/lib/types";

export const dynamic = "force-dynamic";

type Mode = "flip" | "ru_en" | "audio_repeat";

export default async function SalesPhrasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; mode?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  const sp = await searchParams;
  const mode: Mode = (sp.mode as Mode) ?? "flip";
  const ids = sp.ids
    ? sp.ids.split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    : [];

  let rows: SalesPhrase[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<SalesPhrase>`
      SELECT id, text_en, text_ru, context, category, meeting_ref, notes, keywords
      FROM sales_phrases
      WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as SalesPhrase[];
  } else {
    const r = await sql<SalesPhrase>`
      SELECT id, text_en, text_ru, context, category, meeting_ref, notes, keywords
      FROM sales_phrases
      ORDER BY created_at DESC
      LIMIT 20`;
    rows = r.rows;
  }

  return <PhraseRunner items={rows} mode={mode} />;
}
