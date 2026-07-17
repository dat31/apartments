"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Bell, BellOff, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { type SavedSearch } from "@/schemas/saved-search";
import { queryToFilters } from "../lib/saved-search";
import { useDescribeSearch } from "../hooks/use-describe-search";
import { AlertToggle } from "./alert-toggle";
import { FilterChips } from "./filter-chips";

/* One saved search in the browse strip: tapping the body applies the whole
   filter set (it's just a link to the stored query string); the footer holds
   the alert toggle and delete. `active` rings the card whose filters are the
   ones currently applied. */
export function SavedSearchCard({
  search,
  matchCount,
  active,
  onToggleAlerts,
  onDelete,
}: {
  search: SavedSearch;
  matchCount: number | undefined;
  active: boolean;
  onToggleAlerts: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("apartments.savedSearches");
  const describe = useDescribeSearch();
  const { chips } = React.useMemo(
    () => describe(queryToFilters(search.queryString)),
    [describe, search.queryString]
  );

  return (
    <article
      className={cn(
        "flex w-[19.5rem] shrink-0 snap-start flex-col rounded-xl bg-card",
        active
          ? "ring-[1.5px] ring-primary"
          : "ring-1 ring-foreground/10"
      )}
    >
      <Link
        href={`/apartments?${search.queryString}`}
        aria-label={t("applyAria", { name: search.name })}
        className="group flex-1 rounded-t-xl px-4 pb-3 pt-4 text-left focus-ring"
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 shrink-0",
              search.alerts ? "text-primary" : "text-muted-foreground/60"
            )}
          >
            {search.alerts ? <Bell size={16} /> : <BellOff size={16} />}
          </span>
          <h3 className="text-pretty font-medium leading-snug transition-colors group-hover:text-primary">
            {search.name}
          </h3>
        </div>
        {matchCount !== undefined && (
          <p
            className={cn(
              "mt-1.5 text-sm tabular-nums",
              matchCount > 0
                ? "text-muted-foreground"
                : "text-muted-foreground/80"
            )}
          >
            {matchCount > 0
              ? t("matches", { count: matchCount })
              : t("noMatches")}
          </p>
        )}
        {chips.length > 0 && (
          <div className="mt-3">
            <FilterChips chips={chips} max={4} />
          </div>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {t("apply")} <ArrowRight size={15} />
        </span>
      </Link>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <AlertToggle on={search.alerts} onClick={onToggleAlerts} className="flex-1" />
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("deleteAria", { name: search.name })}
          className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-ring"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
