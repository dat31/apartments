import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bath, BedDouble, Clock, MapPin, Maximize } from "lucide-react";
import { PALETTE, money, specStr, availLabel } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { SaveButton } from "@/components/save-button";
import { ViewTransition, type ReactNode } from "react";

export function ListingCard({
  listing,
  badge,
}: {
  listing: Listing;
  badge?: { icon: ReactNode; label: string };
}) {
  const colors = PALETTE[listing.palette];
  const href = `/apartments/${listing.id}`;
  return (
    <Card className="group/listing relative gap-0 overflow-hidden py-0 ring-0 anim-up transition-transform hover:-translate-y-1 hover:bg-accent">
      {/* Stretched link covers the whole card so it stays server-rendered;
          the save button (z-20) and its own clicks sit above it. */}
      <Link
        href={href}
        aria-label={listing.title}
        className="absolute inset-0 z-10 focus-ring"
      />
      <div className="card-media relative aspect-4/3 overflow-hidden">
        <div className="absolute inset-0">
          {listing.images?.length ? (
            <ViewTransition name={`photo-${listing.id}`}>
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </ViewTransition>
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
          <MapPin size={14} /> {districtLabel(listing.district)}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
          <Clock size={14} /> {availLabel(listing)}
        </p>
        <div className="mt-3 pt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble size={16} /> {specStr(listing)}
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
