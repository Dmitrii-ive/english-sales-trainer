"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { ErrorFindingItem } from "@/lib/types";

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ErrorFindingRunner({ items }: { items: ErrorFindingItem[] }) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

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

  const it = items[idx];
  const correct = revealed && normalize(answer) === normalize(it.correct_text);

  function next(g: "hard" | "good" | "easy") {
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "error_finding",
        item_id: it.id,
        grade: UI_GRADE[g],
        exercise_type: "error_finding",
        correct,
        user_answer: answer,
      }),
    });
    setAnswer("");
    setRevealed(false);
    setIdx(idx + 1);
  }

  return (
    <main className="flex-1 flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
          ← {d.errorFinding}
        </Link>
        <div className="text-xs text-[var(--color-fg-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
        Original (has a mistake)
      </div>
      <div className="bg-[var(--color-surface)] border border-[var(--color-danger)]/40 rounded-xl px-4 py-3 text-base">
        {it.text_with_error}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={revealed}
        rows={3}
        placeholder={d.yourAnswer}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3"
      />

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          disabled={!answer.trim()}
          className="bg-[var(--color-accent-strong)] text-white font-medium rounded-xl px-4 py-3"
        >
          {d.submit}
        </button>
      ) : (
        <>
          <div
            className={`text-sm ${
              correct ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            }`}
          >
            {correct ? d.correct : d.incorrect}
          </div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
            {d.correctAnswer}
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-success)]/40 rounded-xl px-4 py-3 text-base">
            {it.correct_text}
          </div>
          {it.error_explanation && (
            <div className="text-sm text-[var(--color-fg-muted)]">
              <span className="uppercase text-[10px] tracking-widest mr-1">
                {d.explanation}:
              </span>
              {it.error_explanation}
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
