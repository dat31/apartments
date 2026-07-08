import { Skeleton } from "@/components/ui/skeleton";

/* Route-section-shaped placeholder shown while the lazy leaflet chunk loads.
   Mirrors TourRouteMap's layout (canvas, legs list) so the day section
   doesn't jump when the map lands. */
export function TourRouteSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="skeleton h-72 sm:h-80 w-full" />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="skeleton h-8 w-full" />
        <Skeleton className="skeleton h-8 w-full" />
        <Skeleton className="skeleton h-4 w-44" />
      </div>
    </div>
  );
}
