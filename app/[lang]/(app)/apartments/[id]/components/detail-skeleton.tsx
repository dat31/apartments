import { Skeleton } from "@/components/ui/skeleton";

/* Detail-shaped placeholder shown while DetailContent streams. Mirrors the
   gallery + two-column layout so the page doesn't jump when content lands —
   replaces the full-screen splash that used to flash on every navigation. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading home">
      {/* Gallery — desktop mosaic */}
      <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-2 aspect-[16/9]">
        <Skeleton className="skeleton col-span-3 row-span-2" />
        <Skeleton className="skeleton col-span-1 row-span-1" />
        <Skeleton className="skeleton col-span-1 row-span-1" />
      </div>
      {/* Gallery — mobile hero */}
      <Skeleton className="skeleton sm:hidden w-full aspect-[16/9]" />

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
        {/* Main column */}
        <div>
          <Skeleton className="skeleton h-6 w-24" />
          <Skeleton className="skeleton mt-3 h-9 w-3/4" />
          <Skeleton className="skeleton mt-2 h-5 w-1/2" />

          <div className="mt-6 flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="skeleton h-12 flex-1 min-w-[120px]"
              />
            ))}
          </div>

          <div className="mt-8">
            <Skeleton className="skeleton h-6 w-40 mb-3" />
            <Skeleton className="skeleton h-4 w-full" />
            <Skeleton className="skeleton mt-2 h-4 w-full" />
            <Skeleton className="skeleton mt-2 h-4 w-2/3" />
          </div>

          <div className="mt-8">
            <Skeleton className="skeleton h-6 w-44 mb-3" />
            <div className="grid sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Sticky booking card */}
        <aside className="hidden md:block">
          <div className="lg:sticky lg:top-24 bg-card p-6">
            <Skeleton className="skeleton h-9 w-40" />
            <Skeleton className="skeleton mt-3 h-4 w-32" />
            <div className="mt-5 flex flex-col gap-2.5">
              <Skeleton className="skeleton h-11 w-full" />
              <Skeleton className="skeleton h-11 w-full" />
            </div>
            <div className="mt-6 pt-6 flex items-center gap-3">
              <Skeleton className="skeleton h-11 w-11 shrink-0" />
              <div className="flex-1">
                <Skeleton className="skeleton h-3 w-16" />
                <Skeleton className="skeleton mt-1.5 h-4 w-24" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
