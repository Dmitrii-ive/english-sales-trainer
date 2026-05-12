"use client";

import Link from "next/link";
import { LocaleSwitch, useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";

export type ProgressData = {
  streak: { current: number; longest: number };
  today: { exercises: number; accuracy: number | null };
  scores: { vocab: number; grammar: number; fluency: number };
  totals: {
    sales_phrase: number;
    vocabulary: number;
    speaking: number;
    roleplay: number;
    cloze: number;
    error_finding: number;
    quiz: number;
    drill: number;
  };
  due_today: number;
  history: { date: string; exercises: number; accuracy: number | null }[]; // last 14 days
};

export function ProgressView({ data }: { data: ProgressData }) {
  const [locale] = useLocale();
  const d = t[locale];
  const labels: Record<keyof ProgressData["totals"], string> = {
    sales_phrase: d.salesPhrases,
    vocabulary: d.vocab,
    speaking: d.speaking,
    roleplay: d.roleplay,
    cloze: d.cloze,
    error_finding: d.errorFinding,
    quiz: d.quiz,
    drill: d.drill,
  };

  const maxBar = Math.max(1, ...data.history.map((h) => h.exercises));

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-10 gap-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
          ← {d.backToHome}
        </Link>
        <LocaleSwitch />
      </header>

      <h1 className="text-2xl font-semibold">{d.progress}</h1>

      <section className="grid grid-cols-2 gap-3">
        <Stat title={d.streak} value={`🔥 ${data.streak.current}`} sub={`best ${data.streak.longest}`} />
        <Stat
          title={d.today}
          value={`${data.today.exercises}`}
          sub={data.today.accuracy != null ? `${Math.round(data.today.accuracy)}% acc` : "—"}
        />
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
          Level
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard label={d.vocab} value={data.scores.vocab} />
          <ScoreCard label={d.grammar} value={data.scores.grammar} />
          <ScoreCard label={d.fluency} value={data.scores.fluency} />
        </div>
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
          Last 14 days
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {data.history.map((h) => (
            <div
              key={h.date}
              className="flex-1 flex flex-col items-center justify-end gap-1"
              title={`${h.date}: ${h.exercises} exercises`}
            >
              <div
                className="w-full bg-[var(--color-accent)] rounded-sm"
                style={{
                  height: `${(h.exercises / maxBar) * 100}%`,
                  minHeight: h.exercises > 0 ? "4px" : "1px",
                  opacity: h.exercises > 0 ? 1 : 0.2,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-fg-muted)] mt-1">
          <span>{data.history[0]?.date.slice(5)}</span>
          <span>{data.history[data.history.length - 1]?.date.slice(5)}</span>
        </div>
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
          Library
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
          {(Object.keys(data.totals) as (keyof ProgressData["totals"])[]).map((k) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm">{labels[k]}</span>
              <span className="text-sm tabular-nums text-[var(--color-fg-muted)]">
                {data.totals[k]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm">Due for review today</span>
        <span className="text-lg font-semibold tabular-nums">{data.due_today}</span>
      </section>

      <form
        action="/api/auth"
        method="post"
        className="mt-auto pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "logout" }),
          }).then(() => (window.location.href = "/login"));
        }}
      >
        <button
          type="submit"
          className="text-xs text-[var(--color-fg-muted)] underline-offset-2 hover:underline"
        >
          {d.logout}
        </button>
      </form>
    </main>
  );
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
        {title}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--color-fg-muted)] mt-1">{sub}</div>}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{Math.round(value)}</div>
      <div className="mt-2 h-1 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
