"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import { BookTourDialog } from "./book-tour-dialog";
import { useSaved } from "@/hooks/use-saved";
import {
  IconLeft,
  IconRight,
  IconPin,
  IconBed,
  IconBath,
  IconArea,
  IconClock,
  IconHeart,
  IconCalendar,
  IconStar,
  IconCheck,
  IconUser,
  AMENITY_ICONS,
} from "@/components/icons";
import {
  type Listing,
  type Review,
  type Owner,
  PALETTE,
  AMENITIES,
  money,
  specStr,
  availLabel,
  avgOf,
} from "@/lib/data/listings";

const PER_PAGE = 4;

export function DetailView({
  listing,
  reviews,
  owner,
}: {
  listing: Listing;
  reviews: Review[];
  owner: Owner | null;
}) {
  const router = useRouter();
  const { isSaved, toggleSave } = useSaved();
  const [active, setActive] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [tourOpen, setTourOpen] = React.useState(false);

  const colors = PALETTE[listing.palette];
  const ams = AMENITIES.filter((a) => listing.amenities.includes(a.id));
  const ownerLabel = listing.owner === "you" ? "You" : owner?.name ?? listing.owner;
  const saved = isSaved(listing.id);

  const avg = avgOf(reviews);
  const pageCount = Math.max(1, Math.ceil(reviews.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageReviews = reviews.slice(
    safePage * PER_PAGE,
    safePage * PER_PAGE + PER_PAGE
  );

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
          <IconUser size={20} className="text-background/95" />
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
          {owner?.verified && <IconCheck size={14} className="text-primary" />}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">
          View profile →
        </p>
      </div>
    </Link>
  );

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6 anim-up">
      <button
        onClick={() => router.push("/apartments")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
      >
        <IconLeft size={18} /> Back to results
      </button>

      {/* Gallery */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div
          className="aspect-[16/10] sm:aspect-[16/9]"
          style={{ background: colors[active] }}
        />
        <div className="flex sm:flex-col gap-3">
          {colors.map((c, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "w-20 sm:w-24 aspect-square overflow-hidden transition-all focus-ring",
                active === i
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              <span className="block w-full h-full" style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
        {/* Main */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{listing.type}</Badge>
            {listing.status === "active" && (
              <Badge>{availLabel(listing)}</Badge>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {listing.title}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
            <IconPin size={16} /> {listing.neighborhood}, {listing.city}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { I: IconBed, label: specStr(listing) },
              {
                I: IconBath,
                label: `${listing.baths} bath${listing.baths > 1 ? "s" : ""}`,
              },
              { I: IconArea, label: `${listing.area} m²` },
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

          {/* Reviews */}
          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Reviews</h2>
                {reviews.length > 0 && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <StarRow value={avg} size={15} />
                    <span className="text-foreground font-medium tabular-nums">
                      {avg.toFixed(1)}
                    </span>
                    · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {owner && (
                <Link
                  href={`/owner/${listing.owner}`}
                  className="text-sm font-medium text-primary hover:underline focus-ring"
                >
                  See host profile →
                </Link>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="bg-card p-10 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-muted-foreground mb-3">
                  <IconStar size={22} />
                </div>
                <h3 className="font-semibold">No reviews yet</h3>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  This home&apos;s host hasn&apos;t been reviewed yet.
                </p>
              </div>
            ) : (
              <>
                <div
                  key={safePage}
                  className="grid sm:grid-cols-2 gap-4 stagger"
                >
                  {pageReviews.map((r) => (
                    <ReviewCard key={r.id} r={r} />
                  ))}
                </div>

                {pageCount > 1 && (
                  <nav
                    className="mt-6 flex items-center justify-between gap-3"
                    aria-label="Reviews pagination"
                  >
                    <Button
                      variant="secondary"
                      className="h-10 gap-1.5"
                      disabled={safePage === 0}
                      onClick={() => setPage(Math.max(0, safePage - 1))}
                    >
                      <IconLeft size={17} /> Prev
                    </Button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: pageCount }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          aria-current={i === safePage ? "page" : undefined}
                          className={cn(
                            "w-10 h-10 text-sm font-medium tabular-nums transition-colors focus-ring",
                            i === safePage
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-primary/10"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      className="h-10 gap-1.5"
                      disabled={safePage === pageCount - 1}
                      onClick={() =>
                        setPage(Math.min(pageCount - 1, safePage + 1))
                      }
                    >
                      Next <IconRight size={17} />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
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
              <IconClock size={16} /> {availLabel(listing)}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                size="lg"
                className="h-12 gap-2"
                onClick={() => setTourOpen(true)}
              >
                <IconCalendar size={18} /> Book tour
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-12 gap-2"
                onClick={() => toggleSave(listing.id)}
              >
                <IconHeart size={18} /> {saved ? "Saved" : "Save home"}
              </Button>
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
              <IconClock size={13} /> {availLabel(listing)}
            </p>
          </div>
          <Button
            variant={saved ? "default" : "secondary"}
            size="icon"
            className="size-11"
            aria-label={saved ? "Saved" : "Save home"}
            onClick={() => toggleSave(listing.id)}
          >
            <IconHeart size={20} />
          </Button>
          <Button className="h-11 gap-2" onClick={() => setTourOpen(true)}>
            <IconCalendar size={18} /> Book tour
          </Button>
        </div>
      </div>

      <BookTourDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        listing={listing}
      />
    </div>
  );
}
