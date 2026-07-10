import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "./gallery";
import { LocationMapLazy } from "./location-map-lazy";
import { Reviews } from "./reviews";
import { SimilarHomes, SimilarHomesSkeleton } from "./similar-homes";
import { OwnerCard, OwnerCardSkeleton } from "./owner-card";
import { SaveHomeButton } from "./save-home-button";
import { BookTourButton } from "./book-tour-button";
import { AvailabilityLabel } from "./availability-label";
import { Bath, BedDouble, Clock, MapPin, Maximize } from "lucide-react";
import { AMENITY_ICONS } from "@/components/icons";
import { PALETTE, AMENITIES } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { coordsOf } from "@/lib/geo";
import { districtLabel, type Listing } from "@/schemas/listing";
import { type Review } from "@/schemas/review";

export function DetailView({
  listing,
  reviews,
  isOwner = false,
}: {
  listing: Listing;
  reviews: Review[];
  isOwner?: boolean;
}) {
  const t = useTranslations("detail");
  const ta = useTranslations("apartments");
  const money = useMoney();
  const colors = PALETTE[listing.palette];
  const coords = coordsOf(listing);
  const ams = AMENITIES.filter((a) => listing.amenities.includes(a.id));

  return (
    <div>
      {/* Gallery */}
      <Gallery images={listing.images} colors={colors} label={listing.title} />

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
        {/* Main */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{ta(`types.${listing.type}`)}</Badge>
            {listing.status === "active" && (
              <Badge>
                <AvailabilityLabel listing={listing} />
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {listing.title}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={16} /> {districtLabel(listing.district)}, {listing.city}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              {
                I: BedDouble,
                label:
                  listing.beds === 0
                    ? ta("card.studio")
                    : ta("card.beds", { count: listing.beds }),
              },
              { I: Bath, label: t("baths", { count: listing.baths }) },
              { I: Maximize, label: `${listing.area} m²` },
            ].map(({ I, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 bg-secondary text-secondary-foreground px-4 py-3 flex-1 min-w-[120px]"
              >
                <I size={20} className="text-primary" />{" "}
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">{t("aboutTitle")}</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
              {listing.desc}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">{t("includedTitle")}</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {ams.map((a) => {
                const I = AMENITY_ICONS[a.icon];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 bg-card px-4 py-3"
                  >
                    <I size={20} className="text-primary" />{" "}
                    <span className="text-[15px]">{ta(`amenities.${a.id}`)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location — approximate coords derived from the district */}
          <LocationMapLazy
            key={listing.id}
            lat={coords[0]}
            lng={coords[1]}
            approx={listing.lat == null || listing.lng == null}
            place={`${districtLabel(listing.district)}, ${listing.city}`}
          />

          {/* Owner — inline on mobile. Streams in its own boundary. */}
          <div className="md:hidden mt-8 bg-card p-5">
            <Suspense fallback={<OwnerCardSkeleton />}>
              <OwnerCard
                ownerKey={listing.owner}
                fallbackPalette={listing.palette}
                isOwner={isOwner}
              />
            </Suspense>
          </div>

          {/* Reviews — first page server-rendered, further pages client-side. */}
          <Reviews reviews={reviews} ownerKey={listing.owner} />
        </div>

        {/* Sticky booking card (tablet / desktop) */}
        <aside className="hidden md:block">
          <div className="lg:sticky lg:top-24 bg-card p-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {money(listing.price)}
              </span>
              <span className="text-muted-foreground">{t("perMonth")}</span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
              <Clock size={16} /> <AvailabilityLabel listing={listing} />
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              {!isOwner && <BookTourButton listing={listing} mode="full" />}
              <SaveHomeButton id={listing.id} mode="full" />
            </div>
            <Suspense fallback={<OwnerCardSkeleton className="mt-6 pt-6" />}>
              <OwnerCard
                ownerKey={listing.owner}
                fallbackPalette={listing.palette}
                isOwner={isOwner}
                className="mt-6 pt-6"
              />
            </Suspense>
          </div>
        </aside>
      </div>

      {/* Similar homes — full width below the two-column layout. Streams in its
          own Suspense boundary so its district/city query doesn't block the
          main listing content above. */}
      <Suspense fallback={<SimilarHomesSkeleton />}>
        <SimilarHomes listing={listing} />
      </Suspense>

      {/* Mobile sticky booking bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-popover anim-fade"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold tracking-tight">
                {money(listing.price)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("perMonthShort")}
              </span>
            </div>
            <p className="flex items-center gap-1 text-xs font-medium text-primary truncate">
              <Clock size={13} /> <AvailabilityLabel listing={listing} />
            </p>
          </div>
          <SaveHomeButton id={listing.id} mode="icon" />
          {!isOwner && <BookTourButton listing={listing} mode="compact" />}
        </div>
      </div>
    </div>
  );
}
