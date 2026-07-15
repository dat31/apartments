"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PALETTE } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { districtLabel, type Listing } from "@/schemas/listing";
import { cn } from "@/lib/utils";
import { Check, Eye, Heart, MapPin, X } from "lucide-react";

/* Top-of-column card: photo, price (with "Lowest" when it wins), title
   linking to the detail page, and the two natural exits — view home and
   save/unsave. The ✕ drops the column by rewriting the ids URL param. */
export function HeaderCard({
  listing,
  columns,
  lowest,
  saved,
  onToggleSave,
  onRemove,
}: {
  listing: Listing;
  columns: number;
  lowest: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("saved.compare");
  const ta = useTranslations("apartments");
  const money = useMoney();
  const href = `/apartments/${listing.id}`;
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[16/10]">
        {listing.images?.length ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            /* Real rendered column width, so two-home comparisons don't get a
               small variant upscaled: (page container, capped at 1400px, minus
               padding + the label column) split across the columns — floored
               at the grid's 230px column minimum (the mobile scroll case). */
            sizes={`max(230px, calc((min(100vw, 1400px) - 244px) / ${columns}))`}
            className="object-cover"
          />
        ) : (
          <span
            className="absolute inset-0"
            style={{ background: PALETTE[listing.palette][0] }}
          />
        )}
        <span className="absolute bottom-2 left-2 z-10">
          <Badge variant="secondary" className="bg-background text-foreground">
            {ta(`types.${listing.type}`)}
          </Badge>
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeColumn")}
          className="absolute top-2 right-2 z-10 w-8 h-8 inline-flex items-center justify-center bg-background/90 text-foreground hover:bg-background transition-colors focus-ring"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-semibold tracking-tight">
            {money(listing.price)}
            <span className="text-sm font-normal text-muted-foreground">
              {ta("card.perMonth")}
            </span>
          </span>
          {lowest && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Check size={13} /> {t("lowest")}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-medium leading-snug text-pretty line-clamp-2">
          <Link href={href} className="focus-ring hover:underline">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={13} /> {districtLabel(listing.district)}
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <Button asChild size="sm" className="flex-1 gap-1.5">
            <Link href={href}>
              <Eye size={15} /> {t("viewHome")}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleSave}
            aria-label={saved ? ta("card.removeSaved") : ta("card.save")}
            className={cn(saved && "text-primary")}
          >
            <Heart size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
