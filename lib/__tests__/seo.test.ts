import { describe, expect, it } from "vitest";
import { localePath, ogDefaults, pageAlternates, SITE_URL } from "@/lib/seo";
import { routing } from "@/i18n/routing";

/* These pin the "as-needed" locale-prefix contract on the SEO side, which has
   to agree with the proxy and next-intl's own routing — a mismatch means
   canonical URLs that redirect, which search engines treat as a soft error. */

describe("localePath", () => {
  it("leaves the default locale unprefixed", () => {
    expect(localePath("vi", "/apartments")).toBe("/apartments");
    expect(localePath("vi", "/")).toBe("/");
  });

  it("prefixes every non-default locale", () => {
    expect(localePath("en", "/apartments")).toBe("/en/apartments");
    expect(localePath("en", "/")).toBe("/en");
  });
});

describe("pageAlternates", () => {
  it("canonicalizes to the current locale's path", () => {
    expect(pageAlternates("en", "/apartments")?.canonical).toBe("/en/apartments");
    expect(pageAlternates("vi", "/apartments")?.canonical).toBe("/apartments");
  });

  it("lists an alternate for every configured locale", () => {
    const languages = pageAlternates("vi", "/apartments")?.languages ?? {};
    for (const locale of routing.locales) {
      expect(languages).toHaveProperty(locale);
    }
  });

  it("points x-default at the default locale", () => {
    const languages = pageAlternates("en", "/apartments")?.languages ?? {};
    expect(languages["x-default"]).toBe(localePath(routing.defaultLocale, "/apartments"));
  });

  it("gives the same alternate set whichever locale is current", () => {
    // Only the canonical should move; the alternates are the same route.
    expect(pageAlternates("vi", "/apartments")?.languages).toEqual(
      pageAlternates("en", "/apartments")?.languages
    );
  });
});

describe("ogDefaults", () => {
  it("maps the app locales to their Open Graph forms", () => {
    expect(ogDefaults("vi").locale).toBe("vi_VN");
    expect(ogDefaults("en").locale).toBe("en_US");
  });

  it("carries the site name and type", () => {
    expect(ogDefaults("vi")).toMatchObject({ siteName: "Danapa", type: "website" });
  });
});

describe("SITE_URL", () => {
  it("is an absolute origin with no trailing slash", () => {
    // metadataBase resolves relative canonicals against this.
    expect(() => new URL(SITE_URL)).not.toThrow();
    expect(SITE_URL.endsWith("/")).toBe(false);
  });
});
