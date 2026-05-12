"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { QuizQuestion } from "@/lib/types";

export function QuizRunner({ items }: { items: QuizQuestion[] }) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-[var(--color-fg-muted)]">
        {d.noContent}
        <Link href="/" className="mt-4 text-[var(--color-accent)]">
          ← {d.backToHome}
        </Link>
      </main>
    );
  }

  if (idx >= items.length) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-3xl">✓</div>
        <div className="text-lg">{items.length} done</div>
        <Link
          href="/"
          className="bg-[var(--color-accent-strong)] text-white font-medium rounded-xl px-6 py-3"
        >
          {d.finish}
        </Link>
      </main>
    );
  }

  const q = items[idx];
  const revealed = picked !== null;
  const correct = picked === q.correct_index;

  function next(g: "hard" | "good" | "easy") {
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "quiz",
        item_id: q.id,
        grade: UI_GRADE[g],
        exercise_type: "quiz",
        correct,
      }),
    });
    setPicked(null);
    setIdx(idx + 1);
  }

  return (
    <main className="flex-1 flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
          ← {d.quiz}
        </Link>
        <div className="text-xs text-[var(--color-fg-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
        {q.quiz_topic}
      </div>
      <div className="text-lg leading-snug">{q.question}</div>

      <div className="flex flex-col gap-2 mt-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct_index;
          const isPicked = i === picked;
          let cls =
            "bg-[var(--color-surface)] border border-[var(--color-border)]";
          if (revealed) {
            if (isCorrect) cls = "bg-[var(--color-success)]/20 border-[var(--color-success)]";
            else if (isPicked) cls = "bg-[var(--color-danger)]/20 border-[var(--color-danger)]";
            else cls = "bg-[var(--color-surface)] border-[var(--color-border)] opacity-60";
          }
          return (
            <button
              key={i}
              onClick={() => !revealed && setPicked(i)}
              disabled={revealed}
              className={`text-left rounded-xl px-4 py-3 border ${cls}`}
            >
              <span className="text-[var(--color-fg-muted)] mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <>
          <div className="mt-2 text-sm">
            <span
              className={
                correct ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
              }
            >
              {correct ? d.correct : d.incorrect}
            </span>
          </div>
          {q.explanation && (
            <div className="text-sm text-[var(--color-fg-muted)]">
              <span className="uppercase text-[10px] tracking-widest mr-1">
                {d.explanation}:
              </span>
              {q.explanation}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mt-auto">
            <button
              onClick={() => next("hard")}
              className="bg-[var(--color-danger)] text-white font-medium rounded-xl px-4 py-3"
            >
              {d.hard}
            </button>
            <button
              onClick={() => next("good")}
              className="bg-[var(--color-warn)] text-white font-medium rounded-xl px-4 py-3"
            >
              {d.good}
            </button>
            <button
              onClick={() => next("easy")}
              className="bg-[var(--color-success)] text-white font-medium rounded-xl px-4 py-3"
            >
              {d.easy}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
