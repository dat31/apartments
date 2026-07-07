import { Skeleton } from "@/components/ui/skeleton";
import { DetailSkeleton } from "./components/detail-skeleton";

/* Route-level fallback shown while the page itself (params + locale) resolves
   — listings outside generateStaticParams have no prerendered shell, so this
   is the first paint on navigation. It mirrors the page's layout and reuses
   the same skeleton its Suspense fallback shows, so loading reads as one
   continuous skeleton instead of a full-screen splash that gets swapped out.

   Kept translation-free (back link as a skeleton bar, no aria label): the
   locale is unknown while the fallback shell prerenders, and any
   useTranslations here would push the boundary up to the global loader. */
export default function Loading() {
  return (
    <div className="container mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6">
      <Skeleton className="skeleton h-5 w-28 mb-5" />
      <DetailSkeleton />
    </div>
  );
}
