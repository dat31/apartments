import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { getNewestShowcase } from "@/lib/services/listings";
import { SectionHeader } from "./section-header";
import { ListingCarousel } from "./listing-carousel";
import { CarouselSkeleton } from "./carousel-skeleton";

/* "Newest homes" — its header renders with the page shell; the carousel
   streams behind Suspense. Data comes from getNewestShowcase, a 30-minute
   cache boundary that also hands back `now` for the cards' availability
   labels. */
export async function NewestSection() {
  const t = await getTranslations("landing.showcase");
  return (
    <section>
      <SectionHeader
        icon={<Sparkles size={18} />}
        title={t("newestTitle")}
        sub={t("newestSub")}
        action={{ label: t("seeAll"), href: "/apartments" }}
      />
      <Suspense fallback={<CarouselSkeleton />}>
        <NewestCarousel />
      </Suspense>
    </section>
  );
}

async function NewestCarousel() {
  const t = await getTranslations("landing.showcase");
  const { listings, now } = await getNewestShowcase();
  return (
    <ListingCarousel
      listings={listings}
      now={now}
      badgeFor={() => ({ icon: <Sparkles size={13} />, label: t("badgeNew") })}
    />
  );
}
