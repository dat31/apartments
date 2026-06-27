// Central i18n configuration. Vietnamese is the default for the Da Nang
// audience; English is the secondary locale. URLs are sub-path prefixed
// (e.g. /vi/apartments, /en/apartments) per the Next.js i18n guide.
export const locales = ["vi", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";

// Cookie that remembers a visitor's explicit language choice; the proxy prefers
// it over the Accept-Language header when redirecting unprefixed requests.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// Human-readable names for the language switcher.
export const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};
