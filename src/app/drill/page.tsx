import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { DrillRunner } from "@/components/DrillRunner";
import type { DrillItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; topic?: string; week?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  const sp = await searchParams;
  const ids = sp.ids
    ? sp.ids.split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    : [];

  let rows: DrillItem[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<DrillItem>`
      SELECT id, topic, subtopic, sentence, options, correct_index, explanation, meeting_ref
      FROM drill_items WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as DrillItem[];
  } else {
    const r = await sql<DrillItem>`
      SELECT id, topic, subtopic, sentence, options, correct_index, explanation, meeting_ref
      FROM drill_items ORDER BY created_at DESC LIMIT 20`;
    rows = r.rows;
  }

  return (
    <DrillRunner items={rows} topicLabel={sp.topic} weekLabel={sp.week} />
  );
}
