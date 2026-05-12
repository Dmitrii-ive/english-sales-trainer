"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import type { DrillItem } from "@/lib/types";
import {
  RunnerShell,
  PrimaryCTA,
  FinishScreen,
  EmptyScreen,
} from "@/components/RunnerShell";

// Auto-grade drill picks based on correctness. SM-2 grade scale: 0..5.
// Correct on first try → 4 (good). Wrong → 2 (hard, will retry sooner).
function gradeFor(correct: boolean): number {
  return correct ? 4 : 2;
}

function renderSentence(sentence: string, picked: string | null) {
  // Split around the blank marker (___ or …)
  const re = /(_{3,}|…)/;
  const parts = sentence.split(re);
  return parts.map((p, i) => {
    if (re.test(p)) {
      return (
        <span
          key={i}
          className={`inline-block min-w-[3rem] text-center border-b-2 ${
            picked
              ? "border-[var(--color-accent)] text-[var(--color-accent-strong)] font-medium"
              : "border-[var(--color-accent)] text-transparent"
          } mx-1 px-1`}
        >
          {picked ?? "___"}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function DrillRunner({
  items,
  topicLabel,
  weekLabel,
}: {
  items: DrillItem[];
  topicLabel?: string;
  weekLabel?: string;
}) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (items.length === 0) {
    return <EmptyScreen message={d.noContent} backLabel={d.backToHome} />;
  }

  if (idx >= items.length) {
    return <FinishScreen count={items.length} buttonLabel={d.finish} />;
  }

  const q = items[idx];
  const revealed = picked !== null;
  const correct = picked === q.correct_index;
  const pickedText = picked !== null ? q.options[picked] : null;

  // Build subtitle: topic from the current item + "N questions"
  const subtitle = `${q.topic} · ${items.length} questions`;
  const eyebrow = weekLabel ? `${weekLabel} · Drill` : "Drill";
  const title = topicLabel ?? "Grammar drill";

  function next() {
    if (picked === null) return;
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "drill",
        item_id: q.id,
        grade: gradeFor(correct),
        exercise_type: "drill",
        correct,
        user_answer: q.options[picked],
      }),
    });
    setPicked(null);
    setIdx(idx + 1);
  }

  return (
    <RunnerShell
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      total={items.length}
      current={idx}
      unitLabel="Question"
      footer={
        revealed ? (
          <PrimaryCTA onClick={next}>
            {idx + 1 < items.length ? d.next : d.finish}
          </PrimaryCTA>
        ) : null
      }
    >
      <div className="font-serif text-2xl leading-snug mt-2">
        {renderSentence(q.sentence, pickedText)}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct_index;
          const isPicked = i === picked;
          let cls = "bg-[var(--color-surface)] border-[var(--color-border)]";
          if (revealed) {
            if (isCorrect) {
              cls =
                "bg-[var(--color-success-soft)] border-[var(--color-success)]";
            } else if (isPicked) {
              cls = "bg-[var(--color-danger-soft)] border-[var(--color-danger)]";
            } else {
              cls = "bg-[var(--color-surface)] border-[var(--color-border)] opacity-50";
            }
          }
          return (
            <button
              key={i}
              onClick={() => !revealed && setPicked(i)}
              disabled={revealed}
              className={`text-left rounded-2xl px-4 py-4 border text-base shadow-sm transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={`mt-2 text-sm font-medium ${
            correct ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
          }`}
        >
          {correct ? d.correct : d.incorrect}
          {!correct && (
            <span className="text-[var(--color-fg-muted)] font-normal ml-2">
              → <span className="text-[var(--color-fg)]">{q.options[q.correct_index]}</span>
            </span>
          )}
        </div>
      )}

      {revealed && q.explanation && (
        <div className="text-sm text-[var(--color-fg-muted)] mt-1">
          {q.explanation}
        </div>
      )}
    </RunnerShell>
  );
}
