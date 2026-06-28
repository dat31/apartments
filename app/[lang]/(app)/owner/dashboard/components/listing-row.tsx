"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PALETTE } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { BedDouble, Eye, MapPin, Pencil, Trash2 } from "lucide-react";
import { ViewTransition } from "react";
import { useMoney } from "@/hooks/use-money";

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
  const money = useMoney();
  const isActive = listing.status === "active";
  const cover = listing.images?.[0];
  const colors = PALETTE[listing.palette];

  return (
    <div className="bg-card flex flex-col sm:flex-row anim-up">
      <div className="sm:w-44 shrink-0">
        <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full overflow-hidden">
          {cover ? (
            <ViewTransition name={`photo-${listing.id}`}>
              <Image
                src={cover}
                alt={listing.title}
                fill
                sizes="(min-width: 640px) 11rem, 100vw"
                className="object-cover"
                unoptimized={cover.startsWith("data:")}
              />
            </ViewTransition>
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
          <h3 className="font-semibold tracking-tight truncate">
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(listing.id)}
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
