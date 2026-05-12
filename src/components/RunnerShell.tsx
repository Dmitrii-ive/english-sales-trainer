"use client";

import Link from "next/link";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export function RunnerShell({
  eyebrow,
  title,
  subtitle,
  total,
  current,
  unitLabel,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  total: number;
  current: number;        // 0-based; pass total to indicate "finished"
  unitLabel: string;      // e.g. "PHRASE" → "PHRASE 3 OF 12"
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const displayIdx = Math.min(current + 1, total);

  return (
    <main className="flex-1 flex flex-col px-5 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          aria-label="Back to home"
          className="text-[var(--color-fg-muted)] text-xl leading-none"
        >
          ←
        </Link>
        <LocaleSwitch />
      </div>

      <div className="text-sm italic text-[var(--color-accent)] font-serif">
        {eyebrow}
      </div>

      <h1 className="font-serif text-4xl leading-tight mt-1 mb-2 text-[var(--color-fg)]">
        {title}
      </h1>

      {subtitle && (
        <div className="text-[var(--color-fg-muted)] text-sm">{subtitle}</div>
      )}

      <div className="border-t border-[var(--color-border)] my-5" />

      <SegmentedProgress total={total} current={current} />

      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-fg-muted)] mt-5 font-mono">
        {unitLabel} {displayIdx} of {total}
      </div>

      <div className="flex-1 flex flex-col mt-3 gap-3">{children}</div>

      {footer && <div className="mt-4">{footer}</div>}
    </main>
  );
}

function SegmentedProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-1 rounded-full ${
            i < current
              ? "bg-[var(--color-fg)]"
              : i === current
                ? "bg-[var(--color-fg)]"
                : "bg-[var(--color-surface-2)]"
          }`}
          style={{
            opacity: i === current ? 1 : i < current ? 0.85 : 1,
          }}
        />
      ))}
    </div>
  );
}

export function PrimaryCTA({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[var(--color-cta)] text-white font-medium rounded-2xl py-4 text-base tracking-tight disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GradeButtons({
  onGrade,
  labels,
}: {
  onGrade: (g: "hard" | "good" | "easy") => void;
  labels: { hard: string; good: string; easy: string };
}) {
  const base =
    "rounded-2xl py-3.5 text-sm font-medium border bg-[var(--color-surface)]";
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => onGrade("hard")}
        className={`${base} text-[var(--color-danger)] border-[var(--color-danger)]/30`}
      >
        {labels.hard}
      </button>
      <button
        onClick={() => onGrade("good")}
        className={`${base} text-[var(--color-warn)] border-[var(--color-warn)]/30`}
      >
        {labels.good}
      </button>
      <button
        onClick={() => onGrade("easy")}
        className={`${base} text-[var(--color-success)] border-[var(--color-success)]/30`}
      >
        {labels.easy}
      </button>
    </div>
  );
}

export function FinishScreen({
  count,
  buttonLabel,
}: {
  count: number;
  buttonLabel: string;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
      <div className="text-5xl font-serif">✓</div>
      <div className="text-2xl font-serif">
        {count} {count === 1 ? "item" : "items"} done
      </div>
      <Link
        href="/"
        className="mt-6 w-full max-w-xs bg-[var(--color-cta)] text-white font-medium rounded-2xl py-4 text-center"
      >
        {buttonLabel}
      </Link>
    </main>
  );
}

export function EmptyScreen({
  message,
  backLabel,
}: {
  message: string;
  backLabel: string;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-[var(--color-fg-muted)] text-center gap-3">
      <div>{message}</div>
      <Link href="/" className="text-[var(--color-accent)] underline-offset-4 hover:underline">
        ← {backLabel}
      </Link>
    </main>
  );
}
