import posthog from "posthog-js";

if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  if (process.env.NODE_ENV === "development") {
    console.error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
    );
  }
} else {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    capture_performance: true,
    /* The project runs no surveys (the flags response reports
       isSurveysEnabled: false), so loading surveys.js only costs a request —
       one that goes through the /ingest rewrite and therefore through the dev
       server, where it stalls behind on-demand route compilation and logs
       "Could not load surveys script". Turn it back on when surveys ship. */
    disable_surveys: true,
  });
}
