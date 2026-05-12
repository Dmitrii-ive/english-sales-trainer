"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleSwitch";
import { t, type Dict } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { SalesPhrase } from "@/lib/types";
import {
  RunnerShell,
  PrimaryCTA,
  GradeButtons,
  FinishScreen,
  EmptyScreen,
} from "@/components/RunnerShell";

type Mode = "flip" | "ru_en" | "audio_repeat";

const MODE_SUBTITLE: Record<Mode, string> = {
  flip: "tap to reveal",
  ru_en: "translate to English",
  audio_repeat: "listen & repeat",
};

const MODE_TITLE: Record<Mode, string> = {
  flip: "Demo phrases",
  ru_en: "Translation drill",
  audio_repeat: "Listen & repeat",
};

const MODE_EYEBROW: Record<Mode, string> = {
  flip: "Phrase Bank · SRS",
  ru_en: "Phrase Bank · RU → EN",
  audio_repeat: "Phrase Bank · Pronunciation",
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function PhraseRunner({
  items,
  mode,
}: {
  items: SalesPhrase[];
  mode: Mode;
}) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [matched, setMatched] = useState<null | boolean>(null);

  const item = items[idx];

  function reset() {
    setRevealed(false);
    setAnswer("");
    setMatched(null);
  }

  function gradeAndNext(g: "hard" | "good" | "easy") {
    if (!item) return;
    const body: Record<string, unknown> = {
      item_type: "sales_phrase",
      item_id: item.id,
      grade: UI_GRADE[g],
      exercise_type: `sales_phrase:${mode}`,
    };
    if (mode === "ru_en") {
      body.user_answer = answer;
      if (matched !== null) body.correct = matched;
    }
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      reset();
    } else {
      setIdx(items.length);
    }
  }

  if (items.length === 0) {
    return <EmptyScreen message={d.noContent} backLabel={d.backToHome} />;
  }

  if (idx >= items.length) {
    return <FinishScreen count={items.length} buttonLabel={d.finish} />;
  }

  const subtitleParts = [`${items.length} phrases`, MODE_SUBTITLE[mode]];

  return (
    <RunnerShell
      eyebrow={MODE_EYEBROW[mode]}
      title={MODE_TITLE[mode]}
      subtitle={subtitleParts.join(" · ")}
      total={items.length}
      current={idx}
      unitLabel="Phrase"
      footer={
        <Footer
          mode={mode}
          revealed={revealed}
          canSubmit={mode === "ru_en" ? answer.trim().length > 0 : true}
          onPrimary={() => {
            if (mode === "ru_en") {
              const userN = normalize(answer);
              const ok =
                item.keywords && item.keywords.length > 0
                  ? item.keywords.every((kw) => userN.includes(normalize(kw)))
                  : userN === normalize(item.text_en);
              setMatched(ok);
              setRevealed(true);
            } else {
              setRevealed(true);
            }
          }}
          onGrade={gradeAndNext}
          d={d}
        />
      }
    >
      {mode === "flip" && <FlipBody item={item} revealed={revealed} d={d} />}
      {mode === "ru_en" && (
        <TranslateBody
          item={item}
          answer={answer}
          setAnswer={setAnswer}
          revealed={revealed}
          matched={matched}
          d={d}
        />
      )}
      {mode === "audio_repeat" && (
        <AudioBody item={item} revealed={revealed} d={d} />
      )}
    </RunnerShell>
  );
}

function Footer({
  mode,
  revealed,
  canSubmit,
  onPrimary,
  onGrade,
  d,
}: {
  mode: Mode;
  revealed: boolean;
  canSubmit: boolean;
  onPrimary: () => void;
  onGrade: (g: "hard" | "good" | "easy") => void;
  d: Dict;
}) {
  if (!revealed) {
    return (
      <PrimaryCTA onClick={onPrimary} disabled={!canSubmit}>
        {mode === "ru_en" ? d.submit : d.show}
      </PrimaryCTA>
    );
  }
  return (
    <GradeButtons
      onGrade={onGrade}
      labels={{ hard: d.hard, good: d.good, easy: d.easy }}
    />
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 flex flex-col gap-3 shadow-sm">
      {children}
    </div>
  );
}

function FlipBody({
  item,
  revealed,
  d,
}: {
  item: SalesPhrase;
  revealed: boolean;
  d: Dict;
}) {
  return (
    <CardShell>
      <div className="text-xs italic text-[var(--color-fg-muted)] font-serif">
        {d.translate}
      </div>
      <div className="font-serif text-2xl leading-snug mt-2">{item.text_ru}</div>

      {revealed && (
        <>
          <div className="border-t border-[var(--color-border)] mt-6 pt-6">
            <div className="text-xs italic text-[var(--color-fg-muted)] font-serif mb-2">
              English
            </div>
            <div className="text-xl leading-snug">{item.text_en}</div>
            {item.notes && (
              <div className="mt-3 text-sm text-[var(--color-fg-muted)]">
                {item.notes}
              </div>
            )}
          </div>
          <button
            onClick={() => speak(item.text_en)}
            className="mt-4 self-start inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            aria-label={d.listen}
          >
            🔊 <span>{d.listen}</span>
          </button>
        </>
      )}
    </CardShell>
  );
}

function TranslateBody({
  item,
  answer,
  setAnswer,
  revealed,
  matched,
  d,
}: {
  item: SalesPhrase;
  answer: string;
  setAnswer: (s: string) => void;
  revealed: boolean;
  matched: boolean | null;
  d: Dict;
}) {
  return (
    <CardShell>
      <div className="text-xs italic text-[var(--color-fg-muted)] font-serif">
        {d.translate}
      </div>
      <div className="font-serif text-2xl leading-snug mt-2">{item.text_ru}</div>

      {item.keywords && item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.keywords.map((kw, i) => (
            <span
              key={i}
              className="inline-block text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent)]/8 text-[var(--color-accent-strong)] border border-[var(--color-accent)]/20"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={revealed}
        rows={3}
        placeholder={d.yourAnswer}
        className="mt-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-fg)]"
      />

      {revealed && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div
            className={`text-sm font-medium ${
              matched ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            }`}
          >
            {matched ? d.correct : d.incorrect}
          </div>
          <div className="text-xs italic text-[var(--color-fg-muted)] font-serif mt-3">
            {d.correctAnswer}
          </div>
          <div className="text-base mt-1">{item.text_en}</div>
          <button
            onClick={() => speak(item.text_en)}
            className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            aria-label={d.listen}
          >
            🔊 <span>{d.listen}</span>
          </button>
        </div>
      )}
    </CardShell>
  );
}

function AudioBody({
  item,
  revealed,
  d,
}: {
  item: SalesPhrase;
  revealed: boolean;
  d: Dict;
}) {
  const played = useRef(false);
  useEffect(() => {
    if (!played.current) {
      played.current = true;
      speak(item.text_en);
    }
  }, [item.id, item.text_en]);

  return (
    <CardShell>
      <div className="text-xs italic text-[var(--color-fg-muted)] font-serif">
        Listen & repeat
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
        <button
          onClick={() => speak(item.text_en)}
          className="w-20 h-20 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-3xl"
          aria-label={d.listen}
        >
          🔊
        </button>
        <div className="text-sm text-[var(--color-fg-muted)]">{d.listen}</div>
      </div>

      {revealed && (
        <div className="border-t border-[var(--color-border)] pt-4">
          <div className="font-serif text-xl leading-snug">{item.text_en}</div>
          <div className="text-sm text-[var(--color-fg-muted)] mt-2">{item.text_ru}</div>
        </div>
      )}
    </CardShell>
  );
}
