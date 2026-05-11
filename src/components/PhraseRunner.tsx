"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t, type Dict } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { SalesPhrase } from "@/lib/types";

type Mode = "flip" | "ru_en" | "audio_repeat";

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
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "sales_phrase",
        item_id: item.id,
        grade: UI_GRADE[g],
        exercise_type: `sales_phrase:${mode}`,
      }),
    });
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      reset();
    } else {
      setIdx(items.length); // finish
    }
  }

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
          className="mt-4 bg-[var(--color-accent-strong)] text-black font-medium rounded-xl px-6 py-3"
        >
          {d.finish}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-5 gap-4">
      <TopBar idx={idx} total={items.length} label={d.salesPhrases} />
      {mode === "flip" && (
        <FlipCard
          item={item}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          d={d}
        />
      )}
      {mode === "ru_en" && (
        <TranslateCard
          item={item}
          answer={answer}
          setAnswer={setAnswer}
          matched={matched}
          onSubmit={() => {
            const ok = normalize(answer) === normalize(item.text_en);
            setMatched(ok);
            setRevealed(true);
          }}
          revealed={revealed}
          d={d}
        />
      )}
      {mode === "audio_repeat" && (
        <AudioCard
          item={item}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          d={d}
        />
      )}

      {revealed && (
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <Btn variant="danger" onClick={() => gradeAndNext("hard")}>{d.hard}</Btn>
          <Btn variant="warn" onClick={() => gradeAndNext("good")}>{d.good}</Btn>
          <Btn variant="success" onClick={() => gradeAndNext("easy")}>{d.easy}</Btn>
        </div>
      )}
    </main>
  );
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function TopBar({
  idx,
  total,
  label,
}: {
  idx: number;
  total: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
        ← {label}
      </Link>
      <div className="text-xs text-[var(--color-fg-muted)]">
        {idx + 1} / {total}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "danger" | "warn" | "success";
}) {
  const color =
    variant === "danger"
      ? "bg-[var(--color-danger)]"
      : variant === "warn"
        ? "bg-[var(--color-warn)]"
        : "bg-[var(--color-success)]";
  return (
    <button
      onClick={onClick}
      className={`${color} text-black font-medium rounded-xl px-4 py-3`}
    >
      {children}
    </button>
  );
}

function FlipCard({
  item,
  revealed,
  onReveal,
  d,
}: {
  item: SalesPhrase;
  revealed: boolean;
  onReveal: () => void;
  d: Dict;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
        RU
      </div>
      <div className="text-xl">{item.text_ru}</div>
      <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
        {revealed ? (
          <>
            <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
              EN
            </div>
            <div className="text-xl">{item.text_en}</div>
            {item.notes && (
              <div className="mt-3 text-sm text-[var(--color-fg-muted)]">
                {item.notes}
              </div>
            )}
            <SpeakButton text={item.text_en} className="mt-3" label={d.listen} />
          </>
        ) : (
          <button
            onClick={onReveal}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 w-full"
          >
            {d.show}
          </button>
        )}
      </div>
    </div>
  );
}

function TranslateCard({
  item,
  answer,
  setAnswer,
  onSubmit,
  matched,
  revealed,
  d,
}: {
  item: SalesPhrase;
  answer: string;
  setAnswer: (s: string) => void;
  onSubmit: () => void;
  matched: boolean | null;
  revealed: boolean;
  d: Dict;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
        {d.translate}
      </div>
      <div className="text-xl">{item.text_ru}</div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={revealed}
        rows={3}
        className="mt-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3"
        placeholder={d.yourAnswer}
      />

      {!revealed && (
        <button
          onClick={onSubmit}
          disabled={!answer.trim()}
          className="mt-3 bg-[var(--color-accent-strong)] text-black font-medium rounded-xl px-4 py-3"
        >
          {d.submit}
        </button>
      )}

      {revealed && (
        <div className="mt-4">
          <div
            className={`text-sm font-medium ${
              matched ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            }`}
          >
            {matched ? d.correct : d.incorrect}
          </div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] mt-3">
            {d.correctAnswer}
          </div>
          <div className="text-lg">{item.text_en}</div>
          <SpeakButton text={item.text_en} className="mt-2" label={d.listen} />
        </div>
      )}
    </div>
  );
}

function AudioCard({
  item,
  revealed,
  onReveal,
  d,
}: {
  item: SalesPhrase;
  revealed: boolean;
  onReveal: () => void;
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
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
        Listen & repeat
      </div>
      <SpeakButton text={item.text_en} large label={d.listen} />
      {revealed ? (
        <>
          <div className="text-xl mt-4">{item.text_en}</div>
          <div className="text-sm text-[var(--color-fg-muted)]">{item.text_ru}</div>
        </>
      ) : (
        <button
          onClick={onReveal}
          className="mt-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-6 py-3"
        >
          {d.show}
        </button>
      )}
    </div>
  );
}

function SpeakButton({
  text,
  className,
  large,
  label,
}: {
  text: string;
  className?: string;
  large?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={() => speak(text)}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] ${
        large ? "px-6 py-4 text-base" : "px-3 py-2 text-sm"
      } ${className ?? ""}`}
      aria-label={label}
    >
      <span aria-hidden>🔊</span>
      <span>{label}</span>
    </button>
  );
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
