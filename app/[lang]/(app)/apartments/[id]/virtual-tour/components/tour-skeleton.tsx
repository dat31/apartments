import { Skeleton } from "@/components/ui/skeleton";

/* Stage-shaped placeholder for the three.js chunk. Same footprint as the
   viewer so nothing jumps when the canvas lands. */
export function TourStageSkeleton() {
  return (
    <div className="relative h-[60svh] w-full bg-secondary lg:h-full" aria-busy="true">
      <div className="absolute inset-x-0 bottom-0 flex gap-2 p-3 sm:p-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="skeleton h-14 w-24 shrink-0 sm:h-16 sm:w-28" />
        ))}
      </div>
    </div>
  );
}

/* Page-shaped placeholder while the listing and its tour stream in. Mirrors
   TourStage's layout: header row, stage, property column. */
export function TourSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col lg:h-[calc(100svh-5rem)]" aria-busy="true" aria-label={label}>
      <div className="border-b">
        <div className="container mx-auto flex items-center gap-4 px-5 py-3 sm:px-8">
          <div className="min-w-0 flex-1">
            <Skeleton className="skeleton h-4 w-28" />
            <Skeleton className="skeleton mt-2 h-5 w-64 max-w-full" />
          </div>
          <Skeleton className="skeleton h-4 w-16" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <TourStageSkeleton />
        <aside className="w-full shrink-0 border-t p-5 sm:p-6 lg:w-[340px] lg:border-l lg:border-t-0">
          <Skeleton className="skeleton h-8 w-40" />
          <Skeleton className="skeleton mt-3 h-4 w-32" />
          <Skeleton className="skeleton mt-5 h-11 w-full" />
          <Skeleton className="skeleton mt-2.5 h-11 w-full" />
        </aside>
      </div>
    </div>
  );
}
