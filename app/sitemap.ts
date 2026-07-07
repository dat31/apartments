import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localePath, SITE_URL } from "@/lib/seo";
import { getActiveListings } from "@/lib/services/listings";
import { OWNERS, SEED_LISTINGS } from "@/lib/data/listings";

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
  const listings = await getActiveListings();

  // Live Supabase listings plus the seed listings still linked from the
  // landing page; owner profiles for seed hosts and hosts of live listings.
  const hrefs = new Set<string>([
    "/",
    "/apartments",
    ...listings.map((l) => `/apartments/${l.id}`),
    ...SEED_LISTINGS.map((l) => `/apartments/${l.id}`),
    ...Object.keys(OWNERS).map((id) => `/owner/${id}`),
    ...listings.map((l) => `/owner/${l.owner}`),
  ]);

  return [...hrefs].map(entry);
}
