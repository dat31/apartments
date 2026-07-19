import { Flame, MapPin, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import { SectionHeader } from "./section-header";

/* Mirrors LandingShowcase's footprint so the static shell doesn't jump when
   the streamed showcase resolves. Section titles are static text, so they
   render for real here — only the data-driven items are skeletons. Kept
   synchronous (no data fetch) so it never suspends as a Suspense fallback. */
export function LandingShowcaseSkeleton({
  districtsTitle,
  districtsSub,
  newestTitle,
  newestSub,
  trendingTitle,
  trendingSub,
  seeAll,
}: {
  districtsTitle: string;
  districtsSub: string;
  newestTitle: string;
  newestSub: string;
  trendingTitle: string;
  trendingSub: string;
  seeAll: string;
}) {
  const carousels = [
    { icon: <Sparkles size={18} />, title: newestTitle, sub: newestSub },
    { icon: <Flame size={18} />, title: trendingTitle, sub: trendingSub },
  ];
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col py-16 gap-16">
      {/* Browse by district */}
      <section>
        <SectionHeader
          icon={<MapPin size={18} />}
          title={districtsTitle}
          sub={districtsSub}
        />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="skeleton min-h-40 w-full rounded-xl" />
          ))}
        </div>
      </section>

      {/* Newest / Trending carousels */}
      {carousels.map((c) => (
        <section key={c.title}>
          <SectionHeader
            icon={c.icon}
            title={c.title}
            sub={c.sub}
            action={{ label: seeAll, href: "/apartments" }}
          />
          <div className="flex gap-5 overflow-hidden pb-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[280px] sm:w-[300px]">
                <SkeletonListingCard />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
