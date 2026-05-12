"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";
import { UI_GRADE } from "@/lib/sr";
import type { ClozeItem } from "@/lib/types";

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "blank"; idx: number; answer: string; alternatives: string[] };

function segmentize(it: ClozeItem): Segment[] {
  const sorted = [...it.blanks].sort((a, b) => a.position - b.position);
  const out: Segment[] = [];
  let cursor = 0;
  sorted.forEach((b, i) => {
    if (b.position > cursor) {
      out.push({ kind: "text", value: it.full_text_en.slice(cursor, b.position) });
    }
    out.push({
      kind: "blank",
      idx: i,
      answer: b.answer,
      alternatives: b.alternatives ?? [],
    });
    cursor = b.position + b.answer.length;
  });
  if (cursor < it.full_text_en.length) {
    out.push({ kind: "text", value: it.full_text_en.slice(cursor) });
  }
  return out;
}

export function ClozeRunner({ items }: { items: ClozeItem[] }) {
  const [locale] = useLocale();
  const d = t[locale];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  const it = items[idx];
  const segments = useMemo(() => (it ? segmentize(it) : []), [it]);
  const blanksCount = segments.filter((s) => s.kind === "blank").length;

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
          className="bg-[var(--color-accent-strong)] text-black font-medium rounded-xl px-6 py-3"
        >
          {d.finish}
        </Link>
      </main>
    );
  }

  const allCorrect =
    revealed &&
    segments
      .filter((s): s is Extract<Segment, { kind: "blank" }> => s.kind === "blank")
      .every((s, i) => {
        const user = normalize(answers[i] ?? "");
        return (
          user === normalize(s.answer) ||
          s.alternatives.some((a) => user === normalize(a))
        );
      });

  function setAns(i: number, v: string) {
    const copy = [...answers];
    while (copy.length < blanksCount) copy.push("");
    copy[i] = v;
    setAnswers(copy);
  }

  function next(g: "hard" | "good" | "easy") {
    void fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: "cloze",
        item_id: it.id,
        grade: UI_GRADE[g],
        exercise_type: "cloze",
        correct: allCorrect,
        user_answer: answers.join(" | "),
      }),
    });
    setAnswers([]);
    setRevealed(false);
    setIdx(idx + 1);
  }

  return (
    <main className="flex-1 flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[var(--color-fg-muted)] text-sm">
          ← {d.cloze}
        </Link>
        <div className="text-xs text-[var(--color-fg-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      {it.hint_ru && (
        <div className="text-xs text-[var(--color-fg-muted)]">
          {it.hint_ru}
        </div>
      )}

      <div className="text-base leading-relaxed">
        {segments.map((s, i) =>
          s.kind === "text" ? (
            <span key={i}>{s.value}</span>
          ) : (
            <BlankInput
              key={i}
              value={answers[s.idx] ?? ""}
              onChange={(v) => setAns(s.idx, v)}
              answer={s.answer}
              alternatives={s.alternatives}
              revealed={revealed}
              size={Math.max(s.answer.length, 4)}
            />
          ),
        )}
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          disabled={!answers.some((a) => a && a.trim().length > 0)}
          className="bg-[var(--color-accent-strong)] text-black font-medium rounded-xl px-4 py-3 mt-4"
        >
          {d.submit}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <button
            onClick={() => next("hard")}
            className="bg-[var(--color-danger)] text-black font-medium rounded-xl px-4 py-3"
          >
            {d.hard}
          </button>
          <button
            onClick={() => next("good")}
            className="bg-[var(--color-warn)] text-black font-medium rounded-xl px-4 py-3"
          >
            {d.good}
          </button>
          <button
            onClick={() => next("easy")}
            className="bg-[var(--color-success)] text-black font-medium rounded-xl px-4 py-3"
          >
            {d.easy}
          </button>
        </div>
      )}
    </main>
  );
}

function BlankInput({
  value,
  onChange,
  answer,
  alternatives,
  revealed,
  size,
}: {
  value: string;
  onChange: (v: string) => void;
  answer: string;
  alternatives: string[];
  revealed: boolean;
  size: number;
}) {
  const ok =
    revealed &&
    (normalize(value) === normalize(answer) ||
      alternatives.some((a) => normalize(value) === normalize(a)));

  if (!revealed) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: `${size + 2}ch` }}
        className="inline-block mx-1 px-2 py-1 bg-[var(--color-surface)] border-b-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none rounded text-base"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    );
  }

  return (
    <span
      className={`inline-block mx-1 px-2 py-1 rounded border ${
        ok
          ? "bg-[var(--color-success)]/20 border-[var(--color-success)]/60"
          : "bg-[var(--color-danger)]/15 border-[var(--color-danger)]/60"
      }`}
    >
      {ok ? value : (
        <>
          <span className="line-through text-[var(--color-fg-muted)] mr-2">
            {value || "—"}
          </span>
          <span>{answer}</span>
        </>
      )}
    </span>
  );
}
