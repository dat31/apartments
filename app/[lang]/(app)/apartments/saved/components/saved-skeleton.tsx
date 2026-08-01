"use client";

import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { SAVED_PAGE_SIZE } from "@/hooks/use-saved-listings";
import { FiltersPanelSkeleton } from "@/app/[lang]/(app)/apartments/components/filters-panel-skeleton";

/* Loading shape for <SavedList>'s body: the desktop filter sidebar, the
   mobile filter/sort row and a full page of cards — the same three regions
   the loaded page shows, in the same two-column frame, so nothing jumps
   sideways when the data lands. */
export function SavedListSkeleton() {
  const ta = useTranslations("apartments");
  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 bg-sidebar text-sidebar-foreground p-6">
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
            <SlidersHorizontal size={18} /> {ta("filters")}
          </h3>
          <FiltersPanelSkeleton />
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-5 lg:hidden">
          <Skeleton className="skeleton h-9 w-24" />
          <Skeleton className="skeleton h-9 w-24" />
        </div>
        <SkeletonGrid count={SAVED_PAGE_SIZE} />
      </div>
    </div>
  );
}
