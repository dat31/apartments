"use client";

import * as React from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import { AvailabilityLabel } from "@/app/[lang]/(app)/apartments/[id]/components/availability-label";
import { AMENITY_ICONS } from "@/components/icons";
import { AMENITIES, PALETTE } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { useSaved } from "@/hooks/use-saved";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import { coordsOf, formatDistance, kmBetween, type LatLng } from "@/lib/geo";
import { districtLabel, type Listing } from "@/schemas/listing";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Eye,
  Heart,
  LayoutGrid,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { parseCompareIds } from "../../lib/compare";

/* Column-per-home comparison table. The first column holds row labels and
   stays pinned while the columns scroll horizontally (the mobile story);
   "best" cells (lowest price, largest area) get a badge, and the amenity
   matrix shows a ✓/✗ per home — the part that genuinely beats flipping
   between detail tabs. */

/* Browser geolocation for the "distance from you" row. Requested only when
   the user asks (no permission prompt on page load — compare links open cold
   from shares). */
type Geo =
  | { status: "idle" | "locating" | "denied" | "unavailable" }
  | { status: "done"; point: LatLng };

function useCompareListings(ids: string[]) {
  return useQuery({
    queryKey: ["compare-listings", ids.join(",")],
    enabled: ids.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Listing[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .in("id", ids);
      if (error) throw error;
      return (data ?? []).map(toListing);
    },
  });
}

export function CompareView() {
  const t = useTranslations("saved.compare");
  const ts = useTranslations("saved");
  const ta = useTranslations("apartments");
  const td = useTranslations("detail");
  const format = useFormatter();
  const money = useMoney();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSaved, toggleSave } = useSaved();

  const [geo, setGeo] = React.useState<Geo>({ status: "idle" });
  const requestPosition = () => {
    if (!navigator.geolocation) {
      setGeo({ status: "unavailable" });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "done",
          point: [pos.coords.latitude, pos.coords.longitude],
        }),
      (err) => setGeo({ status: err.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const ids = React.useMemo(
    () => parseCompareIds(searchParams.get("ids")),
    [searchParams]
  );
  const query = useCompareListings(ids);
  // Columns follow the URL's id order (the DB returns rows unordered), and a
  // removed id drops instantly even while keepPreviousData still holds the
  // wider previous result.
  const homes = React.useMemo(() => {
    const byId = new Map<string, Listing>();
    for (const l of query.data ?? []) byId.set(l.id, l);
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [query.data, ids]);

  const removeColumn = (id: string) => {
    const next = ids.filter((x) => x !== id);
    router.replace(
      {
        pathname: "/apartments/saved/compare",
        query: next.length ? { ids: next.join(",") } : undefined,
      },
      { scroll: false }
    );
  };

  if (ids.length < 2 || (!query.isPending && homes.length < 2)) {
    return <PickTwo />;
  }

  // Column count: the URL's ids while loading (skeleton), then the homes
  // that actually resolved — some ids may point at removed/inactive listings.
  const n = query.isPending ? ids.length : homes.length;
  const gridCols = {
    gridTemplateColumns: `minmax(140px, 180px) repeat(${n}, minmax(230px, 1fr))`,
  };

  const header = (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <Link
          href="/apartments/saved"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 focus-ring"
        >
          <ArrowLeft size={18} /> {t("back")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
          <LayoutGrid size={26} className="text-primary" /> {t("title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("subtitle", { count: n })}
        </p>
      </div>
      <Button asChild variant="ghost" className="h-11 gap-1.5">
        <Link href="/apartments">
          <Search size={16} /> {ts("keepBrowsing")}
        </Link>
      </Button>
    </div>
  );

  if (query.isPending) {
    return (
      <div className="container mx-auto px-5 sm:px-8 py-8">
        {header}
        <div className="bg-card overflow-x-auto">
          <div className="grid min-w-max" style={gridCols} aria-busy="true">
            <div className="bg-card" />
            {ids.map((id) => (
              <div key={id} className="border-l border-border">
                <SkeletonListingCard />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Row model. `num` rows can be ranked (best); every row suppresses its
     badge when all homes tie so nothing is highlighted for a non-choice. */
  type Row = {
    key: string;
    render: (l: Listing) => React.ReactNode;
    num?: (l: Listing) => number;
    best?: "min" | "max";
    bestLabel?: string;
  };
  const rows: Row[] = [
    {
      key: "price",
      render: (l) => (
        <span>
          {money(l.price)}
          <span className="font-normal text-muted-foreground">
            {ta("card.perMonth")}
          </span>
        </span>
      ),
      num: (l) => l.price,
      best: "min",
      bestLabel: t("lowest"),
    },
    { key: "type", render: (l) => ta(`types.${l.type}`) },
    {
      key: "availability",
      render: (l) => (
        <span className="text-primary font-medium">
          <AvailabilityLabel listing={l} />
        </span>
      ),
    },
    {
      key: "bedrooms",
      render: (l) =>
        l.beds === 0 ? ta("card.studio") : ta("card.beds", { count: l.beds }),
    },
    { key: "bathrooms", render: (l) => td("baths", { count: l.baths }) },
    {
      key: "area",
      render: (l) => `${l.area} m²`,
      num: (l) => l.area,
      best: "max",
      bestLabel: t("largest"),
    },
    { key: "district", render: (l) => districtLabel(l.district) },
    { key: "city", render: (l) => l.city },
  ];

  const bestVal = (row: Row) =>
    (row.best === "min" ? Math.min : Math.max)(...homes.map(row.num!));
  const allSame = (row: Row) =>
    homes.every((l) => row.num!(l) === row.num!(homes[0]));
  const isBest = (row: Row, l: Listing) =>
    !!row.best && !allSame(row) && row.num!(l) === bestVal(row);

  const minPrice = Math.min(...homes.map((l) => l.price));
  const priceBest = (l: Listing) =>
    homes.some((h) => h.price !== homes[0].price) && l.price === minPrice;

  /* Straight-line distances from the user's position (coordsOf falls back to
     an approximate district location when a listing has no owner-set pin). */
  const distances =
    geo.status === "done"
      ? homes.map((l) => kmBetween(geo.point, coordsOf(l)))
      : null;
  const minDistance = distances ? Math.min(...distances) : 0;
  const distancesDiffer =
    !!distances && distances.some((d) => d !== distances[0]);
  const isClosest = (i: number) =>
    !!distances && distancesDiffer && distances[i] === minDistance;

  const bestBadge = (label: string) => (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
      <Check size={13} /> {label}
    </span>
  );

  const cellBase = "px-4 py-3.5 border-t border-border text-sm flex items-center";
  const labelCell = cn(
    cellBase,
    "sticky left-0 z-10 bg-card font-medium text-muted-foreground"
  );
  const sectionBand = (label: string) => (
    <React.Fragment>
      <div
        className={cn(
          labelCell,
          "bg-secondary/50 text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
        )}
      >
        {label}
      </div>
      {homes.map((l) => (
        <div key={l.id} className={cn(cellBase, "border-l bg-secondary/50")} />
      ))}
    </React.Fragment>
  );

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8 anim-up">
      {header}
      <div className="bg-card overflow-x-auto">
        <div className="grid min-w-max" style={gridCols}>
          {/* Header cards */}
          <div className="sticky left-0 z-10 bg-card" />
          {homes.map((l) => (
            <div key={l.id} className="border-l border-border">
              <HeaderCard
                listing={l}
                lowest={priceBest(l)}
                saved={isSaved(l.id)}
                onToggleSave={() => toggleSave(l.id)}
                onRemove={() => removeColumn(l.id)}
              />
            </div>
          ))}

          {sectionBand(t("overview"))}
          {rows.map((row) => (
            <React.Fragment key={row.key}>
              <div className={labelCell}>{t(`rows.${row.key}`)}</div>
              {homes.map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    cellBase,
                    "border-l gap-2",
                    isBest(row, l) && "bg-secondary/40 font-semibold"
                  )}
                >
                  <span>{row.render(l)}</span>
                  {isBest(row, l) && bestBadge(row.bestLabel!)}
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Distance from the user — values once located, otherwise a single
              spanning cell with the opt-in button / status message. */}
          <div className={labelCell}>{t("rows.distance")}</div>
          {distances ? (
            homes.map((l, i) => (
              <div
                key={l.id}
                className={cn(
                  cellBase,
                  "border-l gap-2",
                  isClosest(i) && "bg-secondary/40 font-semibold"
                )}
              >
                <span>{formatDistance(format, distances[i])}</span>
                {isClosest(i) && bestBadge(t("closest"))}
              </div>
            ))
          ) : (
            <div
              className={cn(cellBase, "border-l")}
              style={{ gridColumn: `span ${n}` }}
            >
              {geo.status === "denied" || geo.status === "unavailable" ? (
                <span className="text-muted-foreground">
                  {t(
                    geo.status === "denied"
                      ? "locationDenied"
                      : "locationUnavailable"
                  )}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestPosition}
                  disabled={geo.status === "locating"}
                  className="gap-1.5"
                >
                  <LocateFixed size={15} />{" "}
                  {geo.status === "locating" ? t("locating") : t("useLocation")}
                </Button>
              )}
            </div>
          )}

          {sectionBand(t("amenities"))}
          {AMENITIES.map((a) => {
            const I = AMENITY_ICONS[a.icon];
            return (
              <React.Fragment key={a.id}>
                <div className={cn(labelCell, "gap-2")}>
                  {I && <I size={16} className="text-muted-foreground" />}{" "}
                  {ta(`amenities.${a.id}`)}
                </div>
                {homes.map((l) => (
                  <div key={l.id} className={cn(cellBase, "border-l")}>
                    {l.amenities.includes(a.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                        <Check size={16} className="text-primary" /> {t("yes")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                        <X size={15} /> {t("no")}
                      </span>
                    )}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Top-of-column card: photo, price (with "Lowest" when it wins), title
   linking to the detail page, and the two natural exits — view home and
   save/unsave. The ✕ drops the column by rewriting the ids URL param. */
function HeaderCard({
  listing,
  lowest,
  saved,
  onToggleSave,
  onRemove,
}: {
  listing: Listing;
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
            sizes="340px"
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

/* Fewer than two usable homes (short URL, unsaved/deactivated listings, or
   columns removed down to one) — nudge back to the shortlist. */
function PickTwo() {
  const t = useTranslations("saved.compare");
  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <Link
        href="/apartments/saved"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 focus-ring"
      >
        <ArrowLeft size={18} /> {t("back")}
      </Link>
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <LayoutGrid size={26} />
        </div>
        <h3 className="text-lg font-semibold">{t("pickTwoTitle")}</h3>
        <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
          {t("pickTwoBody")}
        </p>
        <Button asChild className="mt-5 h-11 gap-1.5">
          <Link href="/apartments/saved">
            <Heart size={16} /> {t("back")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
