import { SkeletonListingCard } from "@/components/skeleton-listing-card";

/* Placeholder row shown while a landing carousel's data streams. Mirrors
   ListingCarousel's fixed-width footprint so the section header above it
   doesn't jump when the real cards resolve. */
export function CarouselSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden pb-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[280px] sm:w-[300px]">
          <SkeletonListingCard />
        </div>
      ))}
    </div>
  );
}
