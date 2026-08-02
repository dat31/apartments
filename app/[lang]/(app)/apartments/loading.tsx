import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { FiltersPanelSkeleton } from "./components/filters-panel-skeleton";
import { SlidersHorizontal } from "lucide-react";

export default function Loading() {
  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Skeleton className="skeleton h-8 w-60" />
          <Skeleton className="skeleton mt-1 h-5 w-44" />
        </div>
        {/* Desktop sort lives in the header row (matches Browse's lg:flex). */}
        <div className="hidden lg:flex items-center gap-2">
          <Skeleton className="skeleton h-5 w-16" />
          <Skeleton className="skeleton h-9 w-24" />
        </div>
      </div>
      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-sidebar p-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2 text-sidebar-foreground">
              <SlidersHorizontal size={18} /> Filters
            </h3>
            <FiltersPanelSkeleton />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {/* Mobile-only filter + sort row (matches Browse's lg:hidden). */}
          <div className="flex items-center justify-between gap-3 mb-5 lg:hidden">
            <Skeleton className="skeleton h-9 w-24" />
            <Skeleton className="skeleton h-9 w-24" />
          </div>
          <SkeletonGrid count={6} />
        </div>
      </div>
    </div>
  );
}
