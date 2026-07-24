import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";

/* /robots.txt — keeps crawlers out of account-scoped and auth flows. The
   pages themselves also carry robots noindex (see privateMetadata), so this
   is belt-and-braces. Paths are repeated per non-default locale prefix
   ("as-needed": vi is unprefixed, en lives under /en). */

const PRIVATE_PATHS = [
  "/owner/dashboard",
  "/apartments/saved",
  "/apartments/create",
  "/apartments/*/edit",
  "/tour",
  "/messages",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  const prefixes = [
    "",
    ...routing.locales
      .filter((l) => l !== routing.defaultLocale)
      .map((l) => `/${l}`),
  ];

  return {
    rules: {
      userAgent: "*",
      disallow: [
        ...prefixes.flatMap((p) => PRIVATE_PATHS.map((path) => p + path)),
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
