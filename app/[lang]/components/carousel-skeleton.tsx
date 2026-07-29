import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import { SHOWCASE_SIZE } from "../lib/landing";

/* Placeholder row shown while a landing carousel's data streams. Mirrors
   ListingCarousel's fixed-width footprint so the section header above it
   doesn't jump when the real cards resolve. */
export function CarouselSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden pb-2" aria-hidden="true">
      {/* The real slide is basis-[280px]/[300px] minus its pl-5 gutter, so the
          card itself is 20px narrower than the slide — match the card, not the
          slide, or the row shifts sideways when the data lands. */}
      {Array.from({ length: SHOWCASE_SIZE }).map((_, i) => (
        <div key={i} className="shrink-0 w-[260px] sm:w-[280px]">
          <SkeletonListingCard />
        </div>
      ))}
    </div>
  );
}
