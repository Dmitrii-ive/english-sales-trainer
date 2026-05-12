"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LocaleSwitch, useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import type { DailyExercise, DailyPlan } from "@/lib/types";

const TYPE_HREF: Record<string, string> = {
  sales_phrase: "/sales-phrases",
  vocabulary: "/vocabulary",
  speaking: "/speaking",
  roleplay: "/roleplay",
  cloze: "/cloze",
  error_finding: "/error-finding",
  quiz: "/quiz",
  drill: "/drill",
};

const TYPE_LABEL_KEY: Record<string, keyof (typeof t)["en"]> = {
  sales_phrase: "salesPhrases",
  vocabulary: "vocab",
  speaking: "speaking",
  roleplay: "roleplay",
  cloze: "cloze",
  error_finding: "errorFinding",
  quiz: "quiz",
  drill: "drill",
};

const MODE_LABEL: Record<string, string> = {
  flip: "flashcards",
  ru_en: "RU → EN",
  audio_repeat: "listen & repeat",
  speaking: "speaking",
  roleplay: "roleplay",
  cloze: "fill blanks",
  error_finding: "fix mistakes",
  quiz: "quiz",
  drill: "drill",
};

// Merge consecutive (and non-consecutive) same-(type, mode) exercises into a single row
// with combined item_ids. Preserves first-occurrence order.
function mergeExercises(list: DailyExercise[]): DailyExercise[] {
  const order: string[] = [];
  const map = new Map<string, DailyExercise>();
  for (const ex of list) {
    const key = `${ex.type}:${ex.mode ?? ""}`;
    const cur = map.get(key);
    if (cur) {
      cur.item_ids = [...cur.item_ids, ...ex.item_ids];
    } else {
      map.set(key, { ...ex, item_ids: [...ex.item_ids] });
      order.push(key);
    }
  }
  return order.map((k) => map.get(k)!);
}

export function HomeView({
  plan,
  streak,
  scores,
}: {
  plan: DailyPlan | null;
  streak: number;
  scores: { vocab: number; grammar: number; fluency: number };
}) {
  const [locale] = useLocale();
  const d = t[locale];

  const date = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return fmt.format(new Date());
  }, [locale]);

  const exercises = useMemo(
    () => (plan ? mergeExercises(plan.exercises) : []),
    [plan],
  );

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-10 gap-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-fg-muted)] font-mono">
            {d.today}
          </div>
          <div className="font-serif text-2xl mt-0.5">{date}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <span aria-hidden>🔥</span>{" "}
            <span className="font-semibold">{streak}</span>
            <span className="text-[var(--color-fg-muted)]"> {d.streak}</span>
          </span>
          <LocaleSwitch />
        </div>
      </header>

      {plan ? (
        <>
          {plan.focus && (
            <section>
              <div className="text-sm italic text-[var(--color-accent)] font-serif">
                {d.focus}
              </div>
              <div className="font-serif text-2xl leading-snug mt-1">
                {plan.focus}
              </div>
            </section>
          )}

          <ol className="flex flex-col gap-3 mt-1">
            {exercises.map((ex, i) => {
              const href = TYPE_HREF[ex.type] ?? "/";
              const labelKey = TYPE_LABEL_KEY[ex.type];
              const label = d[labelKey] ?? ex.type;
              const modeLabel =
                ex.mode && MODE_LABEL[ex.mode] && ex.mode !== ex.type
                  ? ` · ${MODE_LABEL[ex.mode]}`
                  : "";
              const params = new URLSearchParams({
                ids: ex.item_ids.join(","),
                ...(ex.mode ? { mode: ex.mode } : {}),
              });
              return (
                <li key={i}>
                  <Link
                    href={`${href}?${params.toString()}`}
                    className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-4 active:bg-[var(--color-surface-2)] shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--color-fg-muted)]">
                          {i + 1} / {exercises.length} · {ex.item_ids.length} items
                        </div>
                        <div className="font-medium mt-0.5">
                          {label}
                          <span className="text-[var(--color-fg-muted)] text-xs">
                            {modeLabel}
                          </span>
                        </div>
                      </div>
                      <div className="text-[var(--color-accent)] text-sm">
                        {d.start} →
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="mt-6 p-5 rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)]">
          {d.nothingToday}
          <div className="text-xs mt-2">{d.askClaude}</div>
        </div>
      )}

      <section className="mt-auto pt-6 border-t border-[var(--color-border)]">
        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--color-fg-muted)] mb-3">
          {d.progress}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Score label={d.vocab} value={scores.vocab} />
          <Score label={d.grammar} value={scores.grammar} />
          <Score label={d.fluency} value={scores.fluency} />
        </div>
        <div className="mt-4">
          <Link
            href="/progress"
            className="text-sm text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            {d.progress} →
          </Link>
        </div>
      </section>
    </main>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div className="font-serif text-2xl mt-1">{Math.round(value)}</div>
    </div>
  );
}
