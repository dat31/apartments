"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconHeart,
  IconPin,
  IconClock,
  IconBed,
  IconBath,
  IconArea,
} from "@/components/icons";
import {
  type Listing,
  PALETTE,
  money,
  specStr,
  availLabel,
} from "@/lib/data/listings";

export function ListingCard({
  listing,
  saved,
  onToggleSave,
}: {
  listing: Listing;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const router = useRouter();
  const colors = PALETTE[listing.palette];
  const href = `/apartments/${listing.id}`;
  return (
    <Card
      onClick={() => router.push(href)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="group/listing gap-0 overflow-hidden py-0 ring-0 anim-up cursor-pointer transition-transform hover:-translate-y-1 hover:bg-accent focus-ring"
    >
      <div className="card-media relative aspect-[4/3] overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover/listing:scale-105"
          style={{ background: colors[0] }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(listing.id);
          }}
          className={cn(
            "absolute top-3 right-3 z-10 w-9 h-9 inline-flex items-center justify-center transition-colors focus-ring",
            saved
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:bg-secondary"
          )}
          aria-label={saved ? "Remove from saved" : "Save"}
        >
          <IconHeart size={18} />
        </button>
        <span className="absolute bottom-3 left-3 z-10">
          <Badge variant="secondary" className="bg-background text-foreground">
            {listing.type}
          </Badge>
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-lg font-semibold tracking-tight">
          {money(listing.price)}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </span>
        <h3 className="mt-1 font-medium leading-snug text-pretty">
          {listing.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <IconPin size={14} /> {listing.neighborhood}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
          <IconClock size={14} /> {availLabel(listing)}
        </p>
        <div className="mt-3 pt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <IconBed size={16} /> {specStr(listing)}
          </span>
          <span className="flex items-center gap-1.5">
            <IconBath size={16} /> {listing.baths}
          </span>
          <span className="flex items-center gap-1.5">
            <IconArea size={16} /> {listing.area} m²
          </span>
        </div>
      </div>
    </Card>
  );
}
