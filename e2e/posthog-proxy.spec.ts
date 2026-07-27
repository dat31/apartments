import { test, expect } from "./fixtures";

/* next.config.ts rewrites /ingest/* to PostHog, but the proxy's matcher has to
   exclude the prefix or next-intl locale-rewrites those requests into Next's
   404 HTML page first — which then breaks posthog-js's rate limiter when it
   tries to parse that HTML as JSON.

   The assertions look at *who answered*, not at PostHog's status codes: an
   `x-middleware-rewrite` header or an HTML body means the request never left
   the app, whatever PostHog would have replied. That keeps the spec stable
   across PostHog's own 200 / 400 / 401 responses.

   The fix is the `ingest` entry in proxy.ts's matcher; drop it and all three
   paths below start answering with Next's 404 document again. */

const NEXT_404_MARKER = /This page could not be found|__NEXT_DATA__|_next\/static/;

test.describe("PostHog reverse proxy", () => {
  for (const path of ["/ingest/flags?v=2", "/ingest/decide", "/ingest/e"]) {
    test(`${path} reaches PostHog instead of the locale router`, async ({
      request,
    }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      const headers = response.headers();

      // The exact symptom of the bug: next-intl rewriting /ingest/x to
      // /vi/ingest/x, which no route serves.
      expect(
        headers["x-middleware-rewrite"],
        "the proxy must not run on /ingest/*"
      ).toBeUndefined();
      expect(
        headers["link"] ?? "",
        "no hreflang alternates — this isn't a page"
      ).not.toContain("hreflang");

      // PostHog answers JSON or plain text; Next's 404 answers HTML.
      expect(headers["content-type"] ?? "").not.toContain("text/html");
      expect(await response.text()).not.toMatch(NEXT_404_MARKER);
    });
  }

  test("static assets are proxied to the PostHog asset host", async ({
    request,
  }) => {
    // /ingest/static/* has its own rewrite; it works regardless of the matcher
    // because the ".js" extension already excludes it from the proxy.
    const response = await request.get("/ingest/static/array.js");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
  });

  test("the locale-prefixed form redirects back to the clean path", async ({
    request,
  }) => {
    // /vi/ingest/* is what the bug produced. Nothing serves it: next-intl
    // strips the redundant default-locale prefix and sends the client to
    // /ingest/*, where the rewrite can take over.
    const response = await request.get("/vi/ingest/flags", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/ingest/flags");
  });
});
