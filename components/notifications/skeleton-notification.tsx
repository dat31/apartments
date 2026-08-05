import { Skeleton } from "@/components/ui/skeleton";

/* Mirrors NotificationRow — avatar tile, a sentence line, a meta line — so the
   popover and the page hold their footprint while the feed loads instead of
   jumping once it arrives. */
export function SkeletonNotifications({ count = 4 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3 px-4 py-3">
          <Skeleton className="skeleton size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="skeleton h-4 w-4/5" />
            <Skeleton className="skeleton mt-2 h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
