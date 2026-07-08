import { Skeleton } from "@/components/ui/skeleton";

/* Map-section-shaped placeholder shown while the lazy leaflet chunk loads.
   Mirrors LocationMap's layout (header row, canvas, footnote) so the page
   doesn't jump when the map lands. */
export function LocationMapSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <Skeleton className="skeleton h-6 w-28" />
          <Skeleton className="skeleton mt-2 h-4 w-44" />
        </div>
        <Skeleton className="skeleton h-8 w-36" />
      </div>
      <Skeleton className="skeleton h-72 sm:h-80 w-full" />
      <Skeleton className="skeleton mt-2 h-3 w-64" />
    </div>
  );
}
