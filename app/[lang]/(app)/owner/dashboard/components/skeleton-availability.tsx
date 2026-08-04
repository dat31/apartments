import { Skeleton } from "@/components/ui/skeleton";
import { TOUR_TIMES } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Mirrors AvailabilityEditor: heading, slot counter, the three presets, and
   seven weekday rows of TOUR_TIMES chips — the same grid, unfilled. */
export function SkeletonAvailability() {
  return (
    <div className="bg-card p-6" aria-busy="true" aria-label="Loading availability">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <Skeleton className="skeleton h-6 w-44" />
          <Skeleton className="skeleton mt-1.5 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="skeleton h-9 w-36" />
      </div>

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <Skeleton className="skeleton h-8 w-28" />
        <Skeleton className="skeleton h-8 w-24" />
        <Skeleton className="skeleton h-8 w-20" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, wd) => (
          <div
            key={wd}
            className="flex flex-col sm:flex-row sm:items-center gap-2 py-1"
          >
            <div className="sm:w-16 shrink-0">
              <Skeleton className="skeleton h-5 w-10" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOUR_TIMES.map((time) => (
                <Skeleton key={time} className="skeleton h-9 w-12" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
