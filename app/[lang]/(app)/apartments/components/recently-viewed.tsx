"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import { getListing, PALETTE } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { districtLabel, type Listing } from "@/schemas/listing";
import {
  RECENTLY_VIEWED_CAP,
  clearRecentlyViewed,
  getRecentlyViewedServerSnapshot,
  getRecentlyViewedSnapshot,
  subscribeRecentlyViewed,
} from "../lib/recently-viewed";

/* "Recently viewed" strip, shown full-width above the browse filters + results.

   A client island below the browse page's static shell so the shell stays
   prerenderable. Reads the localStorage ring buffer (written by the detail
   page's RecordRecentlyViewed), hydrates the ids into full listings the same
   way the guest Saved page does — a browser Supabase read mapped with
   `toListing`, with seed ids falling back to lib/data/listings — then renders a
   compact card per home (a lighter card than the browse grid's: price, title,
   district, no save button — it's a feeder for the shortlist, not a second
   one). Order follows recency; ids whose listing is gone or inactive drop out.
   Renders nothing when there's no history. */

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
    () => ids.filter((id) => id !== excludeId).slice(0, RECENTLY_VIEWED_CAP),
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
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Clock size={17} className="text-muted-foreground" /> {t("title")}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          {t("clear")}
        </button>
      </div>

      {/* Horizontal strip; small negative gutter so focus rings / hover lift
          aren't clipped. Scrollbar stays visible so mouse users can reach
          cards past the viewport edge (same as the saved-searches rail). */}
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {query.isPending
          ? Array.from({ length: visibleIds.length }).map((_, i) => (
              <RecentCardSkeleton key={i} />
            ))
          : (query.data ?? []).map((listing) => (
              <RecentCard key={listing.id} listing={listing} />
            ))}
      </div>
    </section>
  );
}

/* Compact recently-viewed card — lighter than the browse ListingCard (no save
   button, beds/baths, or badges), in the app's card idiom (rounded, hairline
   ring). The whole card is a link back to the detail page. */
function RecentCard({ listing }: { listing: Listing }) {
  const t = useTranslations("apartments");
  const money = useMoney();
  const colors = PALETTE[listing.palette];
  return (
    <Link
      href={`/apartments/${listing.id}`}
      aria-label={listing.title}
      className="group block w-56 shrink-0 snap-start overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5 focus-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {listing.images?.length ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            sizes="224px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0" style={{ background: colors[0] }} />
        )}
        <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10" />
      </div>
      <div className="p-3">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold tracking-tight tabular-nums">
            {money(listing.price)}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("card.perMonth")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium leading-snug transition-colors group-hover:text-primary">
          {listing.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin size={12} className="shrink-0" /> {districtLabel(listing.district)}
        </p>
      </div>
    </Link>
  );
}

function RecentCardSkeleton() {
  return (
    <div
      className="w-56 shrink-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      aria-hidden="true"
    >
      <Skeleton className="skeleton skeleton-media aspect-[16/10]" />
      <div className="p-3">
        <Skeleton className="skeleton h-4 w-16" />
        <Skeleton className="skeleton mt-2 h-4 w-full" />
        <Skeleton className="skeleton mt-1.5 h-3 w-2/3" />
      </div>
    </div>
  );
}
