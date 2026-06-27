import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "./gallery";
import { Reviews } from "./reviews";
import { SaveHomeButton } from "./save-home-button";
import { BookTourButton } from "./book-tour-button";
import { AvailabilityLabel } from "./availability-label";
import {
  Bath,
  BedDouble,
  Check,
  Clock,
  MapPin,
  Maximize,
  User,
} from "lucide-react";
import { AMENITY_ICONS } from "@/components/icons";
import { PALETTE, AMENITIES, money, specStr } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { type Review } from "@/schemas/review";
import { type Owner } from "@/schemas/owner";

export function DetailView({
  listing,
  reviews,
  owner,
}: {
  listing: Listing;
  reviews: Review[];
  owner: Owner | null;
}) {
  const colors = PALETTE[listing.palette];
  const ams = AMENITIES.filter((a) => listing.amenities.includes(a.id));
  const ownerLabel = listing.owner === "you" ? "You" : owner?.name ?? listing.owner;

  const renderOwner = (cls: string) => (
    <Link
      href={`/owner/${listing.owner}`}
      className={cn(
        "w-full flex items-center gap-3 text-left group focus-ring",
        cls
      )}
    >
      <span
        className="inline-flex items-center justify-center w-11 h-11 shrink-0 font-semibold text-sm text-background/95"
        style={{
          background:
            PALETTE[(owner ? owner.palette : listing.palette) % PALETTE.length][0],
        }}
      >
        {ownerLabel === "You" ? (
          <User size={20} className="text-background/95" />
        ) : (
          ownerLabel
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Listed by</p>
        <p className="font-medium capitalize group-hover:text-primary transition-colors flex items-center gap-1.5">
          {ownerLabel}{" "}
          {owner?.verified && <Check size={14} className="text-primary" />}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">
          View profile →
        </p>
      </div>
    </Link>
  );

  return (
    <div className="anim-up">
      {/* Gallery */}
      <Gallery id={listing.id} images={listing.images} colors={colors} label={listing.title} />

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
        {/* Main */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{listing.type}</Badge>
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
              { I: BedDouble, label: specStr(listing) },
              {
                I: Bath,
                label: `${listing.baths} bath${listing.baths > 1 ? "s" : ""}`,
              },
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
            <h2 className="text-lg font-semibold mb-2">About this place</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
              {listing.desc}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">What&apos;s included</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {ams.map((a) => {
                const I = AMENITY_ICONS[a.icon];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 bg-card px-4 py-3"
                  >
                    <I size={20} className="text-primary" />{" "}
                    <span className="text-[15px]">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Owner — inline on mobile */}
          <div className="md:hidden mt-8 bg-card p-5">{renderOwner("")}</div>

          {/* Reviews — first page server-rendered, further pages client-side. */}
          <Reviews reviews={reviews} owner={owner} ownerKey={listing.owner} />
        </div>

        {/* Sticky booking card (tablet / desktop) */}
        <aside className="hidden md:block">
          <div className="lg:sticky lg:top-24 bg-card p-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {money(listing.price)}
              </span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
              <Clock size={16} /> <AvailabilityLabel listing={listing} />
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <BookTourButton listing={listing} mode="full" />
              <SaveHomeButton id={listing.id} mode="full" />
            </div>
            {renderOwner("mt-6 pt-6")}
          </div>
        </aside>
      </div>

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
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="flex items-center gap-1 text-xs font-medium text-primary truncate">
              <Clock size={13} /> <AvailabilityLabel listing={listing} />
            </p>
          </div>
          <SaveHomeButton id={listing.id} mode="icon" />
          <BookTourButton listing={listing} mode="compact" />
        </div>
      </div>
    </div>
  );
}
