import "server-only";
import type { Locale } from "./config";

// The canonical dictionary shape comes from the default-locale file; every
// other locale file must structurally match it.
export type Dictionary = typeof import("@/dictionaries/vi.json");

// Server-only dictionary loader. Translation files are imported dynamically so
// only the requested locale's strings are ever loaded, and never shipped to the
// client. Add new locales here alongside lib/i18n/config.ts.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  vi: () => import("@/dictionaries/vi.json").then((m) => m.default),
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
