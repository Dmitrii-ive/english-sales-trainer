import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ClozeRunner } from "@/components/ClozeRunner";
import type { ClozeItem } from "@/lib/types";

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

  let rows: ClozeItem[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<ClozeItem>`
      SELECT id, full_text_en, blanks, hint_ru, meeting_ref
      FROM cloze_items WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as ClozeItem[];
  } else {
    const r = await sql<ClozeItem>`
      SELECT id, full_text_en, blanks, hint_ru, meeting_ref
      FROM cloze_items ORDER BY created_at DESC LIMIT 15`;
    rows = r.rows;
  }

  return <ClozeRunner items={rows} />;
}
