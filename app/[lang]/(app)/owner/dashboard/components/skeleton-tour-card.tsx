import { Skeleton } from "@/components/ui/skeleton";

/* Mirrors OwnerTourCard: a 360px cover beside a body that runs status,
   listing, renter and slot down to the button row. */
function SkeletonTourCard() {
  return (
    <div className="bg-card flex flex-col sm:flex-row" aria-hidden="true">
      <div className="sm:w-[360px] shrink-0">
        <div className="relative aspect-[16/9]">
          <Skeleton className="skeleton skeleton-media absolute inset-0" />
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Skeleton className="skeleton h-5 w-24 mb-1" />
            <Skeleton className="skeleton h-5 w-2/3" />
            <Skeleton className="skeleton mt-1.5 h-4 w-1/2" />
          </div>
          <Skeleton className="skeleton h-10 w-56" />
        </div>
        <div className="flex gap-2 mt-auto">
          <Skeleton className="skeleton h-8 w-24" />
          <Skeleton className="skeleton h-8 w-36" />
          <Skeleton className="skeleton h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTourCards({ count = 2 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading tour requests">
      <Skeleton className="skeleton h-5 w-48 mb-3" aria-hidden="true" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonTourCard key={i} />
        ))}
      </div>
    </div>
  );
}
