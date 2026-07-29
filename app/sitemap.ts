import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localePath, SITE_URL } from "@/lib/seo";
import { getActiveListings, getActiveOwnerIds } from "@/lib/services/listings";

/* /sitemap.xml — every indexable route in both locales. Each entry lists the
   default-locale URL plus hreflang alternates (getPathname applies the
   "as-needed" prefix: vi clean, /en for English). Private routes (dashboard,
   saved, tours, create/edit, auth) are deliberately absent — they're
   noindexed and disallowed in robots.ts. */

function entry(href: string): MetadataRoute.Sitemap[number] {
  const url = (locale: (typeof routing.locales)[number]) =>
    SITE_URL + localePath(locale, href);
  return {
    url: url(routing.defaultLocale),
    alternates: {
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
        "x-default": url(routing.defaultLocale),
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, ownerIds] = await Promise.all([
    getActiveListings(),
    getActiveOwnerIds(),
  ]);

  // Every active listing, plus a profile page per host that has one. Hosts
  // with no active listing have nothing worth indexing.
  const hrefs = new Set<string>([
    "/",
    "/apartments",
    ...listings.map((l) => `/apartments/${l.id}`),
    ...ownerIds.map((id) => `/owner/${id}`),
  ]);

  return [...hrefs].map(entry);
}
