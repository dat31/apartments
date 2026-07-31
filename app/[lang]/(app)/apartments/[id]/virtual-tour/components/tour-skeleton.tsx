import { Skeleton } from "@/components/ui/skeleton";

/* Placeholder for the three.js chunk: the dark room the canvas will fill,
   painted edge to edge inside the stage so nothing moves when it lands. */
export function TourStageSkeleton() {
  return <div className="tour-shell absolute inset-0" aria-busy="true" />;
}

/* Page-shaped placeholder while the listing and its tour stream in. Mirrors
   TourStage: a dark full-height room with glass chrome floating on it. */
export function TourSkeleton({ label }: { label: string }) {
  return (
    <div
      className="dark tour-shell relative h-[calc(100svh-5rem)] min-h-140 overflow-hidden"
      aria-busy="true"
      aria-label={label}
    >
      <div className="absolute inset-x-0 top-0 flex items-start gap-2 p-3 sm:p-4">
        <div className="tour-glass min-w-0 flex-1 px-3.5 py-2.5 sm:max-w-96">
          <Skeleton className="skeleton h-3.5 w-28" />
          <Skeleton className="skeleton mt-2 h-4 w-56 max-w-full" />
          <Skeleton className="skeleton mt-2 h-3 w-32" />
        </div>
        <div className="tour-glass hidden h-11 w-52 sm:block" />
      </div>

      <div className="absolute right-4 top-28 hidden h-96 w-88 lg:block">
        <div className="tour-glass h-full p-5">
          <Skeleton className="skeleton h-7 w-40" />
          <Skeleton className="skeleton mt-3 h-4 w-32" />
          <Skeleton className="skeleton mt-6 h-12 w-full" />
          <Skeleton className="skeleton mt-2.5 h-12 w-full" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tour-glass h-11 w-36 shrink-0" />
          ))}
        </div>
        <div className="tour-glass h-14 lg:hidden" />
      </div>
    </div>
  );
}
