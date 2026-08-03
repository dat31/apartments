"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PALETTE } from "@/lib/data/listings";
import { districtLabel, writtenLocales, type Listing } from "@/schemas/listing";
import { localeNames, type Locale } from "@/i18n/routing";
import {
  BedDouble,
  Eye,
  Globe,
  MapPin,
  Pencil,
  Rotate3d,
  Trash2,
} from "lucide-react";
import { useMoney } from "@/hooks/use-money";
import posthog from "posthog-js";

/* A single owner-listing management row: cover, meta, and quick actions. */
export function ListingRow({
  listing,
  onToggleStatus,
  onDelete,
}: {
  listing: Listing;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("dashboard");
  const ta = useTranslations("apartments");
  const format = useFormatter();
  const money = useMoney();
  const isActive = listing.status === "active";
  /* Owner surfaces speak the owner's language: this row renders the copy the
     owner typed (the listing arrives unlocalized from useListings), so the
     languages it lists are about the home, never about the dashboard. */
  const written = writtenLocales(listing);
  const cover = listing.images?.[0];
  const colors = PALETTE[listing.palette];

  return (
    <div className="bg-card flex flex-col sm:flex-row anim-up">
      <div className="sm:w-44 shrink-0">
        <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={listing.title}
              fill
              sizes="(min-width: 640px) 11rem, 100vw"
              className="object-cover"
              unoptimized={cover.startsWith("data:")}
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{ background: colors[0] }}
            />
          )}
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? t("status.active") : t("status.draft")}
            </Badge>
            <Badge variant="secondary">{ta(`types.${listing.type}`)}</Badge>
          </div>
          <h3
            lang={written[0]}
            className="font-semibold tracking-tight truncate"
          >
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <MapPin size={14} /> {districtLabel(listing.district)}
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {money(listing.price)}
              {ta("card.perMonth")}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble size={15} />{" "}
              {listing.beds === 0
                ? ta("card.studio")
                : ta("card.beds", { count: listing.beds })}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={15} /> {listing.views}
            </span>
            {/* Which languages this home already has, without opening it to
                find out. Stated as a fact, not a score: a home in one
                language is finished, not incomplete. */}
            <span className="flex items-center gap-1.5">
              <Globe size={15} />
              <span lang={written[0]}>
                {localeNames[written[0] as Locale]}
              </span>
              {written.length > 1 && (
                <span>
                  ·{" "}
                  {t("listings.alsoIn", {
                    languages: format.list(
                      written.slice(1).map((l) => localeNames[l as Locale]),
                      { type: "conjunction" }
                    ),
                  })}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onToggleStatus(listing.id);
              posthog.capture("listing_status_toggled", {
                listing_id: listing.id,
                new_status: isActive ? "draft" : "active",
              });
            }}
          >
            {isActive ? t("listings.pause") : t("listings.publish")}
          </Button>
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label={t("listings.preview")}
          >
            <Link href={`/apartments/${listing.id}`}>
              <Eye size={17} />
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label={t("listings.edit")}
          >
            <Link href={`/apartments/${listing.id}/edit`}>
              <Pencil size={17} />
            </Link>
          </Button>
          {/* The 360° tour is authored per listing, so its way in belongs
              beside the listing's own edit action rather than in the nav. */}
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="h-9 w-9"
            aria-label={t("listings.editTour")}
          >
            <Link href={`/apartments/${listing.id}/virtual-tour/edit`}>
              <Rotate3d size={17} />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onDelete(listing.id)}
            aria-label={t("listings.delete")}
          >
            <Trash2 size={17} />
          </Button>
        </div>
      </div>
    </div>
  );
}
