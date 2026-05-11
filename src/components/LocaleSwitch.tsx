"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const LS_KEY = "est_locale";

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const v = (typeof window !== "undefined" && window.localStorage.getItem(LS_KEY)) as
      | Locale
      | null;
    if (v === "en" || v === "ru") setLocale(v);
  }, []);

  const set = (l: Locale) => {
    setLocale(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, l);
  };

  return [locale, set];
}

export function LocaleSwitch() {
  const [locale, setLocale] = useLocale();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ru" : "en")}
      className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] uppercase tracking-wider"
      aria-label="Toggle language"
    >
      {locale === "en" ? "EN · RU" : "RU · EN"}
    </button>
  );
}
