import { connection } from "next/server";
import { Eye, Flame, MapPin, Sparkles } from "lucide-react";
import { SEED_LISTINGS } from "@/lib/data/listings";
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

  const districts = getDistrictTiles(SEED_LISTINGS);
  const newest = getNewest(SEED_LISTINGS);
  // Keep trending disjoint from newest so no home appears in both rows.
  const trending = getTrending(
    SEED_LISTINGS,
    4,
    new Set(newest.map((l) => l.id))
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col anim-up py-16 gap-16">
      <section>
        <SectionHeader
          icon={<MapPin size={18} />}
          title="Browse by district"
          sub="Jump straight to the neighborhoods you're eyeing"
        />
        <DistrictTiles tiles={districts} />
      </section>

      <section>
        <SectionHeader
          icon={<Sparkles size={18} />}
          title="Newest homes"
          sub="Fresh listings, just added"
          action={{ label: "See all", href: "/apartments" }}
        />
        <ListingCarousel
          listings={newest}
          badgeFor={() => ({ icon: <Sparkles size={13} />, label: "New" })}
        />
      </section>

      <section>
        <SectionHeader
          icon={<Flame size={18} />}
          title="Trending now"
          sub="The homes renters are watching most"
          action={{ label: "See all", href: "/apartments" }}
        />
        <ListingCarousel
          listings={trending}
          badgeFor={(l) => ({
            icon: <Eye size={13} />,
            label: `${l.views.toLocaleString()} views`,
          })}
        />
      </section>
    </div>
  );
}
