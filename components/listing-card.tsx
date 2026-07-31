import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bath, BedDouble, Check, MapPin, Maximize, Rotate3d } from "lucide-react";
import { PALETTE, availInfo } from "@/lib/data/listings";
import { hasDemoTour } from "@/lib/virtual-tour/demo-tours";
import { useMoney } from "@/hooks/use-money";
import { districtLabel, type Listing } from "@/schemas/listing";
import { SaveButton } from "@/components/save-button";
import { DepositHint } from "@/components/deposit-hint";
import { ListingCardLink } from "@/components/listing-card-link";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/* Selection mode (the Saved page's Compare flow). When present, the card's
   stretched link becomes a toggle button and a checkbox chip appears where
   the badge would sit. Function-valued, so only client trees can pass it —
   server call sites simply omit it and keep the plain link card. */
export type ListingCardSelect = {
  selected: boolean;
  /** Selection cap reached — unselected cards go inert until a slot frees. */
  disabled?: boolean;
  onToggle: () => void;
};

export function ListingCard({
  listing,
  badge,
  select,
  now,
  priority,
}: {
  listing: Listing;
  badge?: { icon: ReactNode; label: string };
  select?: ListingCardSelect;
  /** Reference time (epoch ms) for the availability label. Static call sites
      pass a clock read inside a cache boundary; omit it to use the live time. */
  now?: number;
  /** Eager-load + preload the cover photo. Set it only on the handful of cards
      that are above the fold — every card that opts in competes for the same
      early bandwidth, so blanket use is worse than none. */
  priority?: boolean;
}) {
  const t = useTranslations("apartments");
  const tv = useTranslations("virtualTour");
  const format = useFormatter();
  const money = useMoney();
  const colors = PALETTE[listing.palette];
  const href = `/apartments/${listing.id}`;
  const avail = availInfo(listing, now !== undefined ? new Date(now) : undefined);
  const inactive = !!select && !!select.disabled && !select.selected;
  return (
    <Card
      className={cn(
        /* h-full: in a grid the card is the stretched item already, but inside
           a carousel slide it's a nested child — without it the card collapses
           to its content and the row's bottom edges go ragged. */
        "group/listing relative h-full gap-0 overflow-hidden py-0 ring-0 transition-transform hover:-translate-y-1 hover:bg-accent",
        inactive && "opacity-55"
      )}
      style={
        select?.selected
          ? { outline: "2px solid var(--primary)", outlineOffset: 2 }
          : undefined
      }
    >
      {/* Stretched link covers the whole card so the rest stays
          server-rendered; the save button (z-20) and its own clicks sit
          above it. In selection mode the link becomes a toggle instead. */}
      {select ? (
        <button
          type="button"
          onClick={select.onToggle}
          disabled={inactive}
          aria-pressed={select.selected}
          aria-label={listing.title}
          className="absolute inset-0 z-10 focus-ring disabled:cursor-not-allowed"
        />
      ) : (
        <ListingCardLink
          href={href}
          aria-label={listing.title}
          className="absolute inset-0 z-10 focus-ring"
        />
      )}
      <div className="card-media relative aspect-[16/9] overflow-hidden">
        <div className="absolute inset-0">
          {listing.images?.length ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
              /* `priority` alone only drops loading="lazy" and adds a preload
                 link — Next passes fetchPriority straight through, so the LCP
                 hint has to be set separately. */
              fetchPriority={priority ? "high" : undefined}
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{ background: colors[0] }}
            />
          )}
        </div>
        {badge && !select && (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-2.5 h-7 pointer-events-none">
            {badge.icon}
            {badge.label}
          </span>
        )}
        {select && (
          <span
            aria-hidden
            className={cn(
              "absolute top-3 left-3 z-20 w-9 h-9 inline-flex items-center justify-center transition-colors pointer-events-none",
              select.selected
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-foreground"
            )}
          >
            {select.selected ? (
              <Check size={18} />
            ) : (
              <span className="w-4 h-4 border-2 border-current opacity-60" />
            )}
          </span>
        )}
        <SaveButton id={listing.id} />
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-background text-foreground">
            {t(`types.${listing.type}`)}
          </Badge>
          {/* "This home has a 360° tour" — the card is a link to the detail
              page, where the tour's own entry lives, so this is a marker
              rather than a second link competing with the stretched one. */}
          {hasDemoTour(listing.id) && (
            <Badge
              className="gap-1"
              aria-label={tv("badgeLabel")}
              data-testid="listing-card-360"
            >
              <Rotate3d size={13} /> {tv("badge")}
            </Badge>
          )}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        {/* testid: the e2e sort/filter specs read the price off the card, and
            the formatted string alone isn't uniquely locatable. */}
        <span
          data-testid="listing-price"
          className="text-lg font-semibold tracking-tight"
        >
          {money(listing.price)}
          <span className="text-sm font-normal text-muted-foreground">
            {t("card.perMonth")}
          </span>
        </span>
        {/* Two lines, always: clamped so a long title can't push the card, and
            floored at 2lh so a short one still reserves the same block — that
            keeps district/availability on the same baseline across a row. */}
        <h3 className="mt-1 min-h-[2lh] font-medium leading-snug text-pretty line-clamp-2">
          {listing.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} /> {districtLabel(listing.district)}
        </p>
        <p className="mt-1.5 text-sm font-medium text-primary">
          {avail.kind === "now"
            ? t("card.availableNow")
            : t("card.availableOn", {
                date: format.dateTime(avail.date, {
                  month: "short",
                  day: "numeric",
                }),
              })}
        </p>
        <DepositHint listing={listing} className="mt-1" />
        {/* mt-auto pins the specs row to the card's bottom edge, absorbing the
            one row of slack a missing deposit hint leaves; pt-6 keeps the same
            24px minimum gap the old mt-3 pt-3 gave. */}
        <div className="mt-auto pt-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble size={16} />{" "}
            {listing.beds === 0
              ? t("card.studio")
              : t("card.beds", { count: listing.beds })}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath size={16} /> {listing.baths}
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize size={16} /> {listing.area} m²
          </span>
        </div>
      </div>
    </Card>
  );
}
