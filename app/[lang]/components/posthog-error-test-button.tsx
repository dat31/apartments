"use client";

import posthog from "posthog-js";

export function PostHogErrorTestButton() {
  return (
    <button
      onClick={() =>
        posthog.captureException(new Error("PostHog source maps test"))
      }
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        padding: "8px 16px",
        background: "#f84e28",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      Test PostHog Error Tracking
    </button>
  );
}
