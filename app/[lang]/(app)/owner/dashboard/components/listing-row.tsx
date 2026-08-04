import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingRowMenu } from "./listing-row-menu";
import { ListingStatusToggle } from "./listing-status-toggle";
import { PALETTE } from "@/lib/data/listings";
import { districtLabel, writtenLocales, type Listing } from "@/schemas/listing";
import { localeNames, type Locale } from "@/i18n/routing";
import { BedDouble, Eye, Globe, MapPin, Rotate3d } from "lucide-react";
import { useMoney } from "@/hooks/use-money";

/* A single owner-listing management row: cover, meta, and quick actions.
   Whole-listing actions live in the row menu; the two that act on this row's
   own work — its 360° tour and whether it's live — stay out where they can be
   read and hit directly.

   A Server Component: everything here is text and links, and next-intl's
   useTranslations/useFormatter (and useMoney over them) read the request
   locale on the server just as well as in the browser. The two things that
   need a click — the status flip and the row menu — are their own islands and
   take an id, so nothing has to be threaded through this file. */
export function ListingRow({ listing }: { listing: Listing }) {
  const t = useTranslations("dashboard");
  const ta = useTranslations("apartments");
  const format = useFormatter();
  const money = useMoney();
  const isActive = listing.status === "active";
  /* Owner surfaces speak the owner's language: this row renders the copy the
     owner typed (the listing arrives unlocalized from listMyListings), so the
     languages it lists are about the home, never about the dashboard. */
  const written = writtenLocales(listing);
  /* Compact on purpose: this sits in a dense meta row, so the languages read
     as codes and the whole sentence moves into the title. Stated as a fact,
     not a score: a home in one language is finished, not incomplete. */
  const languages =
    localeNames[written[0] as Locale] +
    (written.length > 1
      ? " · " +
        t("listings.alsoIn", {
          languages: format.list(
            written.slice(1).map((l) => localeNames[l as Locale]),
            { type: "conjunction" }
          ),
        })
      : "");
  const cover = listing.images?.[0];
  const colors = PALETTE[listing.palette];

  return (
    <div className="bg-card flex flex-col sm:flex-row anim-up group">
      <div className="sm:w-44 lg:w-64 shrink-0 overflow-hidden sm:self-stretch">
        <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full">
          {cover ? (
            <Image
              src={cover}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 11rem, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
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

      <div className="flex-1 min-w-0 p-5 flex flex-col justify-between gap-4 min-h-36">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1 basis-0">
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="shrink-0"
              >
                {isActive ? t("status.active") : t("status.draft")}
              </Badge>
              <Badge variant="secondary" className="min-w-0 truncate">
                {ta(`types.${listing.type}`)}
              </Badge>
            </div>
            <h3
              lang={written[0]}
              title={listing.title}
              className="font-semibold tracking-tight truncate"
            >
              {listing.title}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{districtLabel(listing.district)}</span>
            </p>
          </div>
          <ListingRowMenu listingId={listing.id} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0 text-sm text-muted-foreground">
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
            <span className="inline-flex items-center gap-1.5" title={languages}>
              <Globe size={15} className="shrink-0" />
              <span className="text-xs font-medium tracking-wide">
                {written.map((l) => l.toUpperCase()).join(" · ")}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* The 360° tour is authored per listing, so its way in belongs
                beside the listing rather than in the nav — and named, since
                whether one exists yet is the thing the owner is checking. */}
            <Button asChild variant="secondary" size="sm" className="min-w-0 shrink">
              <Link href={`/apartments/${listing.id}/virtual-tour/edit`}>
                <Rotate3d size={16} className="shrink-0" />
                <span className="truncate">
                  {listing.hasVirtualTour
                    ? t("listings.tour360")
                    : t("listings.addTour360")}
                </span>
              </Link>
            </Button>
            <ListingStatusToggle
              listingId={listing.id}
              status={listing.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
