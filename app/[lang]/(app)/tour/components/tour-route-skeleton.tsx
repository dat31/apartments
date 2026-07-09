import { Skeleton } from "@/components/ui/skeleton";

/* Route-section-shaped placeholder shown while the lazy leaflet chunk loads.
   Mirrors TourRouteMap's side-by-side footprint (map canvas | legs column)
   so the day section doesn't jump when the map lands. */
export function TourRouteSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Skeleton className="h-72 w-full sm:h-80" />
      <div className="flex flex-col gap-3 py-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
    </div>
  );
}
