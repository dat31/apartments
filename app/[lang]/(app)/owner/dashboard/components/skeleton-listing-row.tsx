import { Skeleton } from "@/components/ui/skeleton";

/* Mirrors ListingRow so the streamed rows land where the fallback stood: the
   same cover proportions, the same min-h-36 body, the same two-line meta
   block above the actions row. */
function SkeletonListingRow() {
  return (
    <div className="bg-card flex flex-col sm:flex-row" aria-hidden="true">
      <div className="sm:w-44 lg:w-64 shrink-0 sm:self-stretch">
        <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full">
          <Skeleton className="skeleton skeleton-media absolute inset-0" />
        </div>
      </div>
      <div className="flex-1 min-w-0 p-5 flex flex-col justify-between gap-4 min-h-36">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Skeleton className="skeleton h-5 w-16" />
              <Skeleton className="skeleton h-5 w-20" />
            </div>
            <Skeleton className="skeleton h-5 w-2/3" />
            <Skeleton className="skeleton mt-1.5 h-4 w-1/3" />
          </div>
          <Skeleton className="skeleton h-10 w-10" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
          <div className="flex items-center gap-4">
            <Skeleton className="skeleton h-4 w-20" />
            <Skeleton className="skeleton h-4 w-16" />
            <Skeleton className="skeleton h-4 w-10" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="skeleton h-8 w-28" />
            <Skeleton className="skeleton h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonListingRows({ count = 3 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Loading listings"
    >
      {/* The language-summary line above the rows holds its place too. */}
      <Skeleton className="skeleton h-5 w-3/4 max-w-lg" aria-hidden="true" />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListingRow key={i} />
      ))}
    </div>
  );
}
