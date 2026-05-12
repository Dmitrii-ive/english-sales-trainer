"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LocaleSwitch, useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import type { DailyPlan } from "@/lib/types";

const TYPE_HREF: Record<string, string> = {
  sales_phrase: "/sales-phrases",
  vocabulary: "/vocabulary",
  speaking: "/speaking",
  roleplay: "/roleplay",
  cloze: "/cloze",
  error_finding: "/error-finding",
  quiz: "/quiz",
};

const TYPE_LABEL_KEY: Record<string, keyof (typeof t)["en"]> = {
  sales_phrase: "salesPhrases",
  vocabulary: "vocab",
  speaking: "speaking",
  roleplay: "roleplay",
  cloze: "cloze",
  error_finding: "errorFinding",
  quiz: "quiz",
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
};

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

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-10 gap-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
            {d.today}
          </div>
          <div className="text-lg font-semibold">{date}</div>
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
              <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-1">
                {d.focus}
              </div>
              <div className="text-base">{plan.focus}</div>
            </section>
          )}

          <ol className="flex flex-col gap-3 mt-2">
            {plan.exercises.map((ex, i) => {
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
                    className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-4 active:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-[var(--color-fg-muted)]">
                          {i + 1} / {plan.exercises.length}
                        </div>
                        <div className="font-medium">
                          {label}
                          <span className="text-[var(--color-fg-muted)] text-xs">
                            {modeLabel}
                          </span>
                        </div>
                      </div>
                      <div className="text-[var(--color-accent)]">{d.start} →</div>
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
        <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{Math.round(value)}</div>
    </div>
  );
}
