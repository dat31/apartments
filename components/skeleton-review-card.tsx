import { Skeleton } from "@/components/ui/skeleton";

/* Mirrors ReviewCard — avatar + name/date pair, then two lines of body — so
   a streaming reviews grid holds its footprint. */
export function SkeletonReviewCard() {
  return (
    <div className="bg-card p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="skeleton w-11 h-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="skeleton h-4 w-28" />
          <Skeleton className="skeleton mt-1.5 h-3 w-20" />
        </div>
        <Skeleton className="skeleton h-4 w-20 shrink-0" />
      </div>
      <Skeleton className="skeleton mt-4 h-4 w-full" />
      <Skeleton className="skeleton mt-2 h-4 w-4/5" />
    </div>
  );
}
