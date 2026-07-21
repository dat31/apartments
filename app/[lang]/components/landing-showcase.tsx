import { getTranslations } from "next-intl/server";
import { Eye, Flame, MapPin, Sparkles } from "lucide-react";
import { getLandingShowcase } from "@/lib/services/listings";
import { SectionHeader } from "./section-header";
import { DistrictTiles } from "./district-tiles";
import { ListingCarousel } from "./listing-carousel";
import { getDistrictTiles, getNewest, getTrending } from "../lib/landing";

/* Landing showcase — explore homes before choosing a role. Server rendered:
   only the carousel scroller is a client island, and the cards inside it stay
   Server Components (passed as children).

   Fully prebuilt at build time: its data comes from getLandingShowcase, a
   cache boundary that revalidates every 30 minutes and hands back both the
   listings and a `now` reference captured inside the cache. `now` is threaded
   into the cards so their relative availability labels don't read the clock
   during render (which Cache Components forbids) — they refresh with each
   30-minute revalidation instead. */
export async function LandingShowcase() {
  const t = await getTranslations("landing.showcase");
  const { listings, now } = await getLandingShowcase();
  const districts = getDistrictTiles(listings);
  const newest = getNewest(listings);
  // Keep trending disjoint from newest so no home appears in both rows.
  const trending = getTrending(listings, 4, new Set(newest.map((l) => l.id)));

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col py-16 gap-16">
      <section>
        <SectionHeader
          icon={<MapPin size={18} />}
          title={t("districtsTitle")}
          sub={t("districtsSub")}
        />
        <DistrictTiles tiles={districts} />
      </section>

      <section>
        <SectionHeader
          icon={<Sparkles size={18} />}
          title={t("newestTitle")}
          sub={t("newestSub")}
          action={{ label: t("seeAll"), href: "/apartments" }}
        />
        <ListingCarousel
          listings={newest}
          now={now}
          badgeFor={() => ({ icon: <Sparkles size={13} />, label: t("badgeNew") })}
        />
      </section>

      <section>
        <SectionHeader
          icon={<Flame size={18} />}
          title={t("trendingTitle")}
          sub={t("trendingSub")}
          action={{ label: t("seeAll"), href: "/apartments" }}
        />
        <ListingCarousel
          listings={trending}
          now={now}
          badgeFor={(l) => ({
            icon: <Eye size={13} />,
            label: t("badgeViews", { views: l.views }),
          })}
        />
      </section>
    </div>
  );
}
