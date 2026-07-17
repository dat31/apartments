"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import { type Listing } from "@/schemas/listing";
import { SAVED_SEARCH_MAX } from "@/schemas/saved-search";
import { parseFilters } from "../lib/query";
import {
  countMatches,
  queryToFilters,
  searchSignature,
} from "../lib/saved-search";
import { useSavedSearches } from "../hooks/use-saved-searches";
import { SavedSearchCard } from "./saved-search-card";

/* Saved-searches strip, shown full-width above the browse filters + results.
   A client island like RecentlyViewed: per-user data can't live in the
   prerendered shell. Renders nothing for guests and for users with no saved
   searches, so the page is unchanged until the feature is used. Live match
   counts come from one client read of the active listings, shared by every
   card through react-query. */
export function SavedSearchesStrip() {
  const t = useTranslations("apartments.savedSearches");
  const { searches, toggleAlerts, removeSearch } = useSavedSearches();
  const searchParams = useSearchParams();

  const currentSignature = React.useMemo(
    () =>
      searchSignature(parseFilters(Object.fromEntries(searchParams.entries()))),
    [searchParams]
  );

  const listingsQuery = useQuery({
    queryKey: ["active-listings"],
    enabled: searches.length > 0,
    queryFn: async (): Promise<Listing[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map(toListing);
    },
  });

  if (searches.length === 0) return null;

  const alertsOn = searches.filter((s) => s.alerts).length;

  return (
    <section className="mb-8 anim-fade" aria-label={t("aria")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {t("title")}
          <span className="font-normal tabular-nums text-muted-foreground">
            ({searches.length}/{SAVED_SEARCH_MAX})
          </span>
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Bell size={14} className="text-primary" />
          {alertsOn > 0
            ? t("alertsSummary", { count: alertsOn })
            : t("alertsHint")}
        </p>
      </div>
      {/* Scrollbar stays visible (unlike recently-viewed): cards are 19.5rem
          wide, so past ~4 saved searches the rail overflows on desktop and a
          mouse user needs the affordance to reach them. */}
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {searches.map((s) => (
          <SavedSearchCard
            key={s.id}
            search={s}
            matchCount={
              listingsQuery.data
                ? countMatches(listingsQuery.data, s.queryString)
                : undefined
            }
            active={
              searchSignature(queryToFilters(s.queryString)) ===
              currentSignature
            }
            onToggleAlerts={() => toggleAlerts(s.id)}
            onDelete={() => removeSearch(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
