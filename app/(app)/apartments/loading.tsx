import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { SlidersHorizontal } from "lucide-react";

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <Skeleton className="skeleton h-8 w-60" />
        <Skeleton className="skeleton mt-2 h-4 w-44" />
      </div>
      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-sidebar p-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2 text-sidebar-foreground">
              <SlidersHorizontal size={18} /> Filters
            </h3>
            <div className="flex flex-col gap-7">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="skeleton h-3.5 w-24 mb-3" />
                  <Skeleton className="skeleton h-11 w-full" />
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="flex justify-end mb-5">
            <Skeleton className="skeleton h-11 w-44" />
          </div>
          <SkeletonGrid count={6} />
        </div>
      </div>
    </div>
  );
}
