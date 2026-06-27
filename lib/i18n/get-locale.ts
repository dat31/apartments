import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import type { NextRequest } from "next/server";
import {
  locales,
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./config";

// Pick the locale for an unprefixed request. An explicit choice saved in the
// NEXT_LOCALE cookie wins; otherwise fall back to the best Accept-Language
// match, then the default locale. Used by the proxy to redirect to a localized
// path.
export function getLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const headers = {
    "accept-language": request.headers.get("accept-language") ?? undefined,
  };

  let languages: string[];
  try {
    languages = new Negotiator({ headers }).languages();
  } catch {
    // Negotiator throws on malformed headers — fall back to the default.
    return defaultLocale;
  }

  return match(languages, locales as readonly string[], defaultLocale) as Locale;
}
