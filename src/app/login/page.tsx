"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocaleSwitch, useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const [locale] = useLocale();
  const d = t[locale];
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (r.ok) {
      router.push("/");
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setErr(j.error ?? "Error");
    }
  }

  return (
    <main className="flex-1 flex flex-col p-6 gap-8">
      <div className="flex items-center justify-between pt-6">
        <h1 className="text-xl font-semibold tracking-tight">{d.appName}</h1>
        <LocaleSwitch />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 mt-8">
        <label className="text-sm text-[var(--color-fg-muted)]">{d.password}</label>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[var(--color-accent)]"
        />
        {err && <div className="text-sm text-[var(--color-danger)]">{err}</div>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="bg-[var(--color-accent-strong)] text-black font-medium rounded-xl px-4 py-3 mt-2"
        >
          {busy ? "…" : d.login}
        </button>
      </form>
    </main>
  );
}
