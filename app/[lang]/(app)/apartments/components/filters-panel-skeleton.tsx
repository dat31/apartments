import { Skeleton } from "@/components/ui/skeleton";

/* Shape-for-shape stand-in for <FiltersPanel>: same gap-7 column, same
   heading/control rhythm, so the sidebar keeps its height when the real
   panel takes over. Chip widths approximate the labels they stand in for
   (a chip is h-9); the advanced group renders collapsed, which is how the
   real panel starts unless the URL already carries an advanced filter. */
export function FiltersPanelSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-hidden="true">
      <Skeleton className="skeleton h-4 w-12" />

      <div>
        <Skeleton className="skeleton h-4 w-16 mb-3" />
        <Skeleton className="skeleton h-11 w-full" />
      </div>

      <div>
        <Skeleton className="skeleton h-4 w-24 mb-3" />
        <div className="flex flex-wrap gap-2">
          {["w-14", "w-20", "w-24", "w-16", "w-24", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`skeleton h-9 ${w}`} />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="skeleton h-4 w-20 mb-3" />
        <div className="flex flex-wrap gap-2">
          {["w-14", "w-24", "w-20", "w-20", "w-28", "w-20", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`skeleton h-9 ${w}`} />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="skeleton h-4 w-28 mb-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="skeleton h-11 flex-1" />
          <span className="text-muted-foreground">–</span>
          <Skeleton className="skeleton h-11 flex-1" />
        </div>
      </div>

      {/* Collapsed "Advanced" accordion trigger — border-t + py-3, as rendered. */}
      <div className="border-t py-3">
        <Skeleton className="skeleton h-4 w-20" />
      </div>

      {/* Reset button. SaveSearch above it only appears once a filter is set,
          so the resting footer is a single control. */}
      <Skeleton className="skeleton h-11 w-full" />
    </div>
  );
}
