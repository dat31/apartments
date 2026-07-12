"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import { getListing } from "@/lib/data/listings";
import { ListingCard } from "@/components/listing-card";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import type { Listing } from "@/schemas/listing";
import {
  RECENTLY_VIEWED_VISIBLE,
  clearRecentlyViewed,
  getRecentlyViewedServerSnapshot,
  getRecentlyViewedSnapshot,
  subscribeRecentlyViewed,
} from "../lib/recently-viewed";

/* "Recently viewed" strip, shown above the browse results.

   A client island below the browse page's static shell so the shell stays
   prerenderable. Reads the localStorage ring buffer (written by the detail
   page's RecordRecentlyViewed), hydrates the ids into full listings the same
   way the guest Saved page does — a browser Supabase read mapped with
   `toListing`, with seed ids falling back to lib/data/listings — and renders
   the compact browse ListingCard so save buttons and price formatting come
   along for free. Order follows recency; ids whose listing is gone or inactive
   simply drop out. Renders nothing when there's no history. */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const t = useTranslations("apartments.recentlyViewed");

  // localStorage is client-only; useSyncExternalStore reads it without a
  // setState-in-effect and re-renders on writes (including the Clear button).
  // The server snapshot is empty, so the strip is absent until after hydration.
  const ids = React.useSyncExternalStore(
    subscribeRecentlyViewed,
    getRecentlyViewedSnapshot,
    getRecentlyViewedServerSnapshot
  );

  const visibleIds = React.useMemo(
    () =>
      ids.filter((id) => id !== excludeId).slice(0, RECENTLY_VIEWED_VISIBLE),
    [ids, excludeId]
  );

  const query = useQuery({
    queryKey: ["recently-viewed", visibleIds],
    enabled: visibleIds.length > 0,
    queryFn: async (): Promise<Listing[]> => {
      // Seed ids ("l1", …) resolve from the in-memory seed data; real uuids
      // come from Supabase (active only, so stale entries drop out).
      const seed = visibleIds
        .filter((id) => !UUID_RE.test(id))
        .map((id) => getListing(id))
        .filter((l): l is Listing => !!l);

      let live: Listing[] = [];
      const uuidIds = visibleIds.filter((id) => UUID_RE.test(id));
      if (uuidIds.length) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "active")
          .in("id", uuidIds);
        if (error) throw error;
        live = (data ?? []).map(toListing);
      }

      // Re-order to match the recency buffer (`.in` doesn't preserve order)
      // and drop ids with no matching listing.
      const byId = new Map<string, Listing>();
      for (const l of [...seed, ...live]) byId.set(l.id, l);
      return visibleIds
        .map((id) => byId.get(id))
        .filter((l): l is Listing => !!l);
    },
  });

  // clearRecentlyViewed notifies the store, which re-renders this to null.
  const clear = () => clearRecentlyViewed();

  // Render nothing when there's no history (also the pre-hydration state).
  if (visibleIds.length === 0) return null;
  // Hydrated but every entry dropped out (all inactive/removed) — hide.
  if (query.isSuccess && query.data.length === 0) return null;

  return (
    <section className="mb-8 anim-fade" aria-label={t("aria")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Clock size={18} className="text-primary" /> {t("title")}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          {t("clear")}
        </button>
      </div>

      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-1 sm:-mx-1 sm:px-1">
        {query.isPending
          ? Array.from({ length: visibleIds.length }).map((_, i) => (
              <div key={i} className="w-64 shrink-0 snap-start">
                <SkeletonListingCard />
              </div>
            ))
          : (query.data ?? []).map((listing) => (
              <div key={listing.id} className="w-64 shrink-0 snap-start">
                <ListingCard listing={listing} />
              </div>
            ))}
      </div>
    </section>
  );
}
