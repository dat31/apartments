import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "./gallery";
import { LocationMapLazy } from "./location-map-lazy";
import { Reviews, ReviewsSkeleton } from "./reviews";
import { SimilarHomes, SimilarHomesSkeleton } from "./similar-homes";
import { OwnerCard, OwnerCardSkeleton } from "./owner-card";
import { SaveHomeButton } from "./save-home-button";
import { ShareButton } from "@/components/share-button";
import { BookTourButton } from "./book-tour-button";
import { MessageOwnerButton } from "@/components/messaging/message-owner-button";
import { RecordRecentlyViewed } from "./record-recently-viewed";
import { AvailabilityLabel } from "./availability-label";
import { NotOwner } from "./viewer-is-owner";
import { CostsSection } from "./costs-section";
import { MoveInEstimate } from "./move-in-estimate";
import { OriginalDisclosure } from "./original-disclosure";
import { Bath, BedDouble, Globe, MapPin, Maximize, Rotate3d } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AMENITY_ICONS } from "@/components/icons";
import { PALETTE, AMENITIES } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { coordsOf } from "@/lib/geo";
import { districtLabel, type LocalizedListing } from "@/schemas/listing";
import { localeNames, type Locale } from "@/i18n/routing";

export function DetailView({
  listing,
  preview,
}: {
  listing: LocalizedListing;
  /** Rendered for the owner on /apartments/[id]/preview, where this home is
      still a draft. Two things that only make sense for a live listing come
      off: the recently-viewed record (its public URL 404s for everyone else,
      so remembering it would plant a dead card in the owner's history) and
      share, which would hand out that same dead URL. */
  preview?: boolean;
}) {
  const t = useTranslations("detail");
  const tc = useTranslations("common");
  const locale = useLocale();
  const ta = useTranslations("apartments");
  const tv = useTranslations("virtualTour");
  const money = useMoney();
  /* A column the row already carries (maintained by a trigger on
     listing_virtual_tours), so asking costs no extra read here. */
  const tourHref = listing.hasVirtualTour
    ? `/apartments/${listing.id}/virtual-tour`
    : undefined;
  const colors = PALETTE[listing.palette];
  const coords = coordsOf(listing);
  const ams = AMENITIES.filter((a) => listing.amenities.includes(a.id));
  const shareText = t("shareText", {
    title: listing.title,
    price: money(listing.price),
    district: districtLabel(listing.district),
    city: listing.city,
  });

  return (
    <div>
      {/* Records this listing in the recently-viewed history (renders nothing). */}
      {!preview && <RecordRecentlyViewed id={listing.id} />}

      {/* Gallery — carries the 360° entry when this home has a tour */}
      <Gallery
        images={listing.images}
        colors={colors}
        label={listing.title}
        tourHref={tourHref}
      />

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
        {/* Main */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{ta(`types.${listing.type}`)}</Badge>
                {listing.status === "active" && (
                  <Badge>
                    <AvailabilityLabel listing={listing} />
                  </Badge>
                )}
              </div>
              {/* lang: title and description fall back independently, so a
                  page may legitimately name a home in English and tell its
                  story in Vietnamese. Each carries its own language for
                  screen readers and hyphenation. */}
              <h1
                lang={listing.titleLocale}
                className="text-3xl font-semibold tracking-tight text-balance"
              >
                {listing.title}
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={16} /> {districtLabel(listing.district)},{" "}
                {listing.city}
              </p>
            </div>
            {/* Tablet / desktop share sits beside the title; mobile share
                lives in the page's back-to-results header row instead. */}
            {!preview && (
              <ShareButton
                title={listing.title}
                text={shareText}
                className="hidden sm:inline-flex shrink-0"
              />
            )}
          </div>

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

          {/* Costs & terms — money questions up top, close to booking intent */}
          <CostsSection listing={listing} />

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">{t("aboutTitle")}</h2>
            {/* whitespace-pre-line: owners write descriptions in paragraphs
                (the seeded ones are three lines each) and a plain <p> collapses
                every newline into a single run-on block. */}
            <p
              lang={listing.descLocale}
              className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground text-pretty"
            >
              {listing.desc}
            </p>
            {/* The description is the owner's original because they haven't
                written one in this language. A person not writing something is
                a fact about that person, not a failure of the app — and a page
                that silently switches language on a reader looks broken. Said
                quietly, because for an English reader it lands on most homes
                for a long while yet. */}
            {listing.descLocale !== locale && (
              <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <Globe size={14} className="shrink-0 mt-0.5" />
                <span className="text-pretty">
                  {t("descriptionNotWritten", {
                    reader: tc(`languages.${locale}`),
                    original: localeNames[listing.descLocale as Locale],
                  })}
                </span>
              </p>
            )}
            {/* The way back to the owner's own words, when the reader is
                being served a translation of them. */}
            <OriginalDisclosure listing={listing} />
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
              />
            </Suspense>
            <NotOwner ownerId={listing.owner}>
              <MessageOwnerButton
                listingId={listing.id}
                className="mt-4 h-11 w-full gap-2"
              />
            </NotOwner>
          </div>

          {/* Reviews — first page server-rendered, further pages fetched by
              the client pager. Streams on its own so the listing content
              above it never waits on the review queries. */}
          <Suspense fallback={<ReviewsSkeleton />}>
            <Reviews ownerKey={listing.owner} />
          </Suspense>
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
            <p className="mt-3 text-sm font-medium text-primary">
              <AvailabilityLabel listing={listing} />
            </p>
            <MoveInEstimate listing={listing} variant="compact" className="mt-4" />
            <div className="mt-5 flex flex-col gap-2.5">
              {/* Above "Book a tour" on purpose: the virtual tour is the step
                  a renter takes to decide whether the real one is worth it.
                  Outside <NotOwner> — a host looking at their own listing has
                  as much reason to check the tour as anyone. */}
              {tourHref && (
                <Button asChild variant="secondary" className="h-11 gap-2">
                  <Link href={tourHref}>
                    <Rotate3d size={18} /> {tv("entryCtaLong")}
                  </Link>
                </Button>
              )}
              <NotOwner ownerId={listing.owner}>
                <BookTourButton listing={listing} mode="full" />
              </NotOwner>
              <SaveHomeButton id={listing.id} mode="full" />
              <NotOwner ownerId={listing.owner}>
                <MessageOwnerButton listingId={listing.id} />
              </NotOwner>
            </div>
            <Suspense fallback={<OwnerCardSkeleton className="mt-6 pt-6" />}>
              <OwnerCard
                ownerKey={listing.owner}
                fallbackPalette={listing.palette}
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
            <p className="text-xs font-medium text-primary truncate">
              <AvailabilityLabel listing={listing} />
            </p>
          </div>
          <SaveHomeButton id={listing.id} mode="icon" />
          <NotOwner ownerId={listing.owner}>
            <BookTourButton listing={listing} mode="compact" />
          </NotOwner>
        </div>
      </div>
    </div>
  );
}
