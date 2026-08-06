import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withPostHogConfig } from "@posthog/nextjs-config";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Listing photos are served from the Supabase project's Storage domain,
// derived from the env so next/image allows it in every environment.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  skipTrailingSlashRedirect: true,
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    /* Exposes the testing API that @next/playwright's instant() drives to hold
       dynamic data back and assert the static shell still commits. Without it
       instant() silently no-ops and every instant spec passes vacuously, so it
       has to be on for the builds we measure — and never in production. The
       instant rig (playwright.instant.config.ts) sets EXPOSE_TESTING_API=1;
       nothing else does. */
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

// Source-map upload needs a personal API key, which only deploy environments
// have — gate on it so local and CI builds don't fail on a missing secret.
export default withPostHogConfig(withNextIntl(nextConfig), {
  personalApiKey: process.env.POSTHOG_API_KEY ?? "",
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: Boolean(process.env.POSTHOG_API_KEY),
    deleteAfterUpload: true,
  },
});

