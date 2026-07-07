import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bath, BedDouble, Clock, MapPin, Maximize } from "lucide-react";
import { PALETTE, availInfo } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { districtLabel, type Listing } from "@/schemas/listing";
import { SaveButton } from "@/components/save-button";
import { ListingCardLink } from "@/components/listing-card-link";
import { type ReactNode } from "react";

export function ListingCard({
  listing,
  badge,
}: {
  listing: Listing;
  badge?: { icon: ReactNode; label: string };
}) {
  const t = useTranslations("apartments");
  const format = useFormatter();
  const money = useMoney();
  const colors = PALETTE[listing.palette];
  const href = `/apartments/${listing.id}`;
  const avail = availInfo(listing);
  return (
    <Card className="group/listing relative gap-0 overflow-hidden py-0 ring-0 transition-transform hover:-translate-y-1 hover:bg-accent">
      {/* Stretched link covers the whole card so the rest stays
          server-rendered; the save button (z-20) and its own clicks sit
          above it. */}
      <ListingCardLink
        href={href}
        aria-label={listing.title}
        className="absolute inset-0 z-10 focus-ring"
      />
      <div className="card-media relative aspect-[16/9] overflow-hidden">
        <div className="absolute inset-0">
          {listing.images?.length ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{ background: colors[0] }}
            />
          )}
        </div>
        {badge && (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-2.5 h-7 pointer-events-none">
            {badge.icon}
            {badge.label}
          </span>
        )}
        <SaveButton id={listing.id} />
        <span className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-background text-foreground">
            {t(`types.${listing.type}`)}
          </Badge>
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-lg font-semibold tracking-tight">
          {money(listing.price)}
          <span className="text-sm font-normal text-muted-foreground">
            {t("card.perMonth")}
          </span>
        </span>
        <h3 className="mt-1 font-medium leading-snug text-pretty">
          {listing.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} /> {districtLabel(listing.district)}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
          <Clock size={14} />{" "}
          {avail.kind === "now"
            ? t("card.availableNow")
            : t("card.availableOn", {
                date: format.dateTime(avail.date, {
                  month: "short",
                  day: "numeric",
                }),
              })}
        </p>
        <div className="mt-3 pt-3 flex items-center gap-4 text-sm text-muted-foreground">
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
