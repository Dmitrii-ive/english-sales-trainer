"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleSwitch";
import { t } from "@/lib/i18n";

export function ComingSoon({ title }: { title: string }) {
  const [locale] = useLocale();
  const d = t[locale];
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
      <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
        {title}
      </div>
      <div className="text-lg">Coming soon</div>
      <Link href="/" className="text-[var(--color-accent)] mt-4">
        ← {d.backToHome}
      </Link>
    </main>
  );
}
