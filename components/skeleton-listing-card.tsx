import { Skeleton } from "@/components/ui/skeleton";

/* Mirrors ListingCard so the skeleton occupies the exact footprint. */
export function SkeletonListingCard() {
  return (
    <div
      className="bg-card text-card-foreground flex flex-col"
      aria-hidden="true"
    >
      <div className="relative aspect-[16/9]">
        <Skeleton className="skeleton skeleton-media absolute inset-0" />
        <div className="absolute top-3 right-3 w-9 h-9 bg-background/80" />
        <div className="absolute bottom-3 left-3 w-20 h-6 bg-background/80" />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <Skeleton className="skeleton h-7 w-28" />
        {/* Two title lines — the real card reserves that block unconditionally
            (min-h-[2lh] + line-clamp-2), so the fallback has to as well. */}
        <Skeleton className="skeleton mt-2.5 h-4 w-full" />
        <Skeleton className="skeleton mt-2 h-4 w-2/3" />
        <Skeleton className="skeleton mt-3 h-3.5 w-1/2" />
        <Skeleton className="skeleton mt-2 h-3.5 w-2/5" />
        {/* pt-6 mirrors the real specs row's minimum gap — with it the
            fallback card lands within a pixel of the card that replaces it. */}
        <div className="mt-4 pt-6 flex items-center gap-4">
          <Skeleton className="skeleton h-4 w-16" />
          <Skeleton className="skeleton h-4 w-10" />
          <Skeleton className="skeleton h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5"
      aria-busy="true"
      aria-label="Loading homes"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListingCard key={i} />
      ))}
    </div>
  );
}
