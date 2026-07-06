import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Eye, Flame, MapPin, Sparkles } from "lucide-react";
import { getActiveListings } from "@/lib/services/listings";
import { SectionHeader } from "./section-header";
import { DistrictTiles } from "./district-tiles";
import { ListingCarousel } from "./listing-carousel";
import { getDistrictTiles, getNewest, getTrending } from "../lib/landing";

/* Landing showcase — explore homes before choosing a role. Server rendered:
   only the carousel scroller is a client island, and the cards inside it stay
   Server Components (passed as children). Streamed (the cards' availability
   labels are relative to the current time), so it reads `connection()` to opt
   into dynamic rendering and renders behind a Suspense boundary. */
export async function LandingShowcase() {
  await connection();

  const t = await getTranslations("landing.showcase");
  // Live listings from Supabase (cached), oldest-first — see getActiveListings.
  const listings = await getActiveListings();
  const districts = getDistrictTiles(listings);
  const newest = getNewest(listings);
  // Keep trending disjoint from newest so no home appears in both rows.
  const trending = getTrending(listings, 4, new Set(newest.map((l) => l.id)));

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col anim-up py-16 gap-16">
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
          badgeFor={(l) => ({
            icon: <Eye size={13} />,
            label: t("badgeViews", { views: l.views }),
          })}
        />
      </section>
    </div>
  );
}
