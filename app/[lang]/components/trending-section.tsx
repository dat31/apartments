import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Eye, Flame } from "lucide-react";
import { getTrendingShowcase } from "@/lib/services/listings";
import { SectionHeader } from "./section-header";
import { ListingCarousel } from "./listing-carousel";
import { CarouselSkeleton } from "./carousel-skeleton";

/* "Trending homes" — its header renders with the page shell; the carousel
   streams behind Suspense. Data comes from getTrendingShowcase, a 30-minute
   cache boundary that keeps the row disjoint from the newest one and hands
   back `now` for the cards' availability labels. */
export async function TrendingSection() {
  const t = await getTranslations("landing.showcase");
  return (
    <section>
      <SectionHeader
        icon={<Flame size={18} />}
        title={t("trendingTitle")}
        sub={t("trendingSub")}
        action={{ label: t("seeAll"), href: "/apartments" }}
      />
      <Suspense fallback={<CarouselSkeleton />}>
        <TrendingCarousel />
      </Suspense>
    </section>
  );
}

async function TrendingCarousel() {
  const t = await getTranslations("landing.showcase");
  const { listings, now } = await getTrendingShowcase();
  return (
    <ListingCarousel
      listings={listings}
      now={now}
      badgeFor={(l) => ({
        icon: <Eye size={13} />,
        label: t("badgeViews", { views: l.views }),
      })}
    />
  );
}
