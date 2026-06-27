import { defineRouting } from "next-intl/routing";

// Vietnamese is the default for the Da Nang audience; English is secondary.
// localePrefix "as-needed" keeps clean URLs for the default locale (e.g.
// /apartments) and prefixes only non-default locales (e.g. /en/apartments).
export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

// Human-readable names for the language switcher.
export const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};
