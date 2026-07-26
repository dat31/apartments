"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "../../lib/recently-viewed";
import posthog from "posthog-js";

/* Pushes this listing's id onto the recently-viewed ring buffer on mount.
   Renders nothing, so the detail page stays server-first — it only exists to
   run the localStorage write client-side (see the RecentlyViewed strip on the
   browse page). */
export function RecordRecentlyViewed({ id }: { id: string }) {
  useEffect(() => {
    recordRecentlyViewed(id);
    posthog.capture("listing_viewed", { listing_id: id });
  }, [id]);
  return null;
}
