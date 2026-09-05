"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "./fr";
import type { Locale } from "./index";

type I18nValue = {
  locale: Locale;
  t: Dictionary;
  /** BCP 47 tag for Intl formatting, e.g. "fr-BE". */
  intl: string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary, intl: dictionary.meta.intl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside an I18nProvider");
  return value;
}

/** Fills {placeholders} in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
