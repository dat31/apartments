"use client";

import { useSearchParams } from "next/navigation";
import { activeFilterCount, parseFilters } from "../lib/query";

/* The active-filter count on the mobile Filters trigger depends only on the
   URL, so it reads it client-side. That lets the trigger button stay in the
   static server shell (no searchParams access above the Suspense boundary). */
export function FilterCountBadge() {
  const searchParams = useSearchParams();
  const count = activeFilterCount(
    parseFilters(Object.fromEntries(searchParams.entries()))
  );
  if (count === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs bg-primary text-primary-foreground">
      {count}
    </span>
  );
}
