import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/** Absolute origin for canonical, hreflang and sitemap URLs. Set
    NEXT_PUBLIC_SITE_URL once a custom domain exists; Vercel deploys fall back
    to the project's production domain. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

type Href = Parameters<typeof getPathname>[0]["href"];

/** Shared openGraph base. Next replaces (not merges) a page's openGraph over
    the layout's, so pages that set their own og fields must spread this in. */
export function ogDefaults(lang: string) {
  return {
    siteName: "Danapa",
    type: "website",
    locale: lang === "vi" ? "vi_VN" : "en_US",
  } as const;
}

/** Locale-prefixed path for a route ("as-needed": vi stays clean, en gets
    /en). Shared by page metadata and the sitemap. */
export function localePath(locale: Locale, href: Href): string {
  return getPathname({ locale, href });
}

/** Canonical + hreflang alternates for one route in the current locale.
    Paths are relative; the root layout's metadataBase makes them absolute.
    The canonical intentionally drops query strings, so filter/sort/page
    permutations of a route all canonicalize to its clean URL. */
/** Metadata for account-scoped pages (saved, tours, dashboard, create/edit):
    a localized tab title plus noindex, since the content is per-user. The
    robots.ts disallow list mirrors these routes for crawlers that skip meta. */
export async function privateMetadata(
  lang: string,
  key:
    | "saved"
    | "compare"
    | "tours"
    | "messages"
    | "create"
    | "edit"
    | "dashboard"
): Promise<Metadata> {
  const t = await getTranslations({ locale: lang, namespace: "meta" });
  return { title: t(`${key}.title`), robots: { index: false } };
}

export function pageAlternates(
  lang: string,
  href: Href
): Metadata["alternates"] {
  return {
    canonical: localePath(lang as Locale, href),
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, localePath(l, href)])
      ),
      "x-default": localePath(routing.defaultLocale, href),
    },
  };
}
