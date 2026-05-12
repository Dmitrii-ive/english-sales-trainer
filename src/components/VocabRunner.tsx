"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { VocabularyItem } from "@/lib/types";

export function VocabRunner({ items }: { items: VocabularyItem[] }) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

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

  function gradeAndNext(g: "hard" | "good" | "easy") {
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "vocabulary",
        item_id: it.id,
        grade: UI_GRADE[g],
        exercise_type: "vocabulary:flip",
      }),
    });
    setFlipped(false);
    setIdx(idx + 1);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <main className="flex-1 flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
          ← {d.vocab}
        </Link>
        <div className="text-xs text-[var(--color-fg-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl flex flex-col items-center justify-center text-center p-8 active:scale-[0.99] transition"
      >
        {!flipped ? (
          <>
            <div className="text-3xl font-semibold">{it.word_en}</div>
            {it.part_of_speech && (
              <div className="mt-2 text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
                {it.part_of_speech}
              </div>
            )}
            <div className="mt-6 text-xs text-[var(--color-fg-muted)]">tap to flip</div>
          </>
        ) : (
          <>
            <div className="text-2xl">{it.word_ru}</div>
            {it.example_en && (
              <div className="mt-4 text-sm text-[var(--color-fg-muted)] italic">
                “{it.example_en}”
              </div>
            )}
          </>
        )}
      </button>

      <div className="flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            speak(it.word_en);
          }}
          className="text-sm text-[var(--color-fg-muted)] inline-flex items-center gap-2"
          aria-label={d.listen}
        >
          🔊 <span>{d.listen}</span>
        </button>
      </div>

      {flipped && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => gradeAndNext("hard")}
            className="bg-[var(--color-danger)] text-white font-medium rounded-xl px-4 py-3"
          >
            {d.hard}
          </button>
          <button
            onClick={() => gradeAndNext("good")}
            className="bg-[var(--color-warn)] text-white font-medium rounded-xl px-4 py-3"
          >
            {d.good}
          </button>
          <button
            onClick={() => gradeAndNext("easy")}
            className="bg-[var(--color-success)] text-white font-medium rounded-xl px-4 py-3"
          >
            {d.easy}
          </button>
        </div>
      )}
    </main>
  );
}
