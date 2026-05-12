import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ErrorFindingRunner } from "@/components/ErrorFindingRunner";
import type { ErrorFindingItem } from "@/lib/types";

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

  let rows: ErrorFindingItem[];
  if (ids.length > 0) {
    const literal = `{${ids.join(",")}}`;
    const r = await sql<ErrorFindingItem>`
      SELECT id, text_with_error, correct_text, error_explanation, meeting_ref
      FROM error_finding_items WHERE id = ANY(${literal}::uuid[])`;
    const map = new Map(r.rows.map((row) => [row.id, row]));
    rows = ids.map((id) => map.get(id)).filter(Boolean) as ErrorFindingItem[];
  } else {
    const r = await sql<ErrorFindingItem>`
      SELECT id, text_with_error, correct_text, error_explanation, meeting_ref
      FROM error_finding_items ORDER BY created_at DESC LIMIT 15`;
    rows = r.rows;
  }

  return <ErrorFindingRunner items={rows} />;
}
