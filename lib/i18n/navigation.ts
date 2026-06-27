"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { defaultLocale, isLocale, type Locale } from "./config";

// Read the active locale from the [lang] route segment. Works in any client
// component rendered under app/[lang], without a provider.
export function useLocale(): Locale {
  const params = useParams();
  const lang = Array.isArray(params?.lang) ? params.lang[0] : params?.lang;
  return typeof lang === "string" && isLocale(lang) ? lang : defaultLocale;
}

// Prefix an in-app path with a locale. Leaves external links, anchors,
// mailto/tel, protocol-relative URLs, and already-prefixed paths untouched.
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const [pathname] = href.split(/(?=[?#])/);
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && isLocale(firstSegment)) return href;

  return `/${locale}${href}`;
}

// Strip a leading locale segment from a pathname, e.g. /vi/apartments ->
// /apartments. Useful for active-link comparisons.
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  if (segments[1] && isLocale(segments[1])) {
    const rest = "/" + segments.slice(2).join("/");
    return rest === "/" ? "/" : rest.replace(/\/$/, "");
  }
  return pathname;
}

// The current pathname with the locale segment removed.
export function useStrippedPathname(): string {
  return stripLocale(usePathname());
}

// useRouter whose push/replace automatically prefix the active locale.
export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale();

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localizeHref(href, locale), options),
    [router, locale]
  );

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localizeHref(href, locale), options),
    [router, locale]
  );

  return useMemo(
    () => ({ ...router, push, replace }),
    [router, push, replace]
  );
}
