import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { VocabRunner } from "@/components/VocabRunner";
import type { VocabularyItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  const sp = await searchParams;
  const ids = sp.ids
    ? sp.ids.split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    : [];

  let rows: VocabularyItem[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<VocabularyItem>`
      SELECT id, word_en, word_ru, example_en, part_of_speech, meeting_ref
      FROM vocabulary
      WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as VocabularyItem[];
  } else {
    const r = await sql<VocabularyItem>`
      SELECT id, word_en, word_ru, example_en, part_of_speech, meeting_ref
      FROM vocabulary
      ORDER BY created_at DESC
      LIMIT 30`;
    rows = r.rows;
  }

  return <VocabRunner items={rows} />;
}
