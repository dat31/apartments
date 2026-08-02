import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import {
  DEFAULT_BASE_LOCALE,
  District,
  type Listing,
  type ListingCore,
  type ListingCosts,
  type ListingText,
} from "@/schemas/listing";
import { hasAnyCost } from "@/lib/listing-costs";

/* Pure row → domain mapping for `listings`, split out of the server-only
   listings service. No `server-only`, no cache, no React — just data.

   The purity is a rule, not an accident: this is where a locale would be
   most tempting to read, and it must never be. Listing copy is carried in
   every locale (see `i18n` below) and resolved at a page boundary by
   localizeListing, so nothing here calls getLocale() — which it could not do
   inside the "use cache" boundaries its callers sit in anyway. */

type ListingRow = Tables<"listings">;

/* Only the three columns that carry meaning — so a freshly written row (which
   has no server-assigned timestamps yet) is as good an input as a read one. */
type TranslationRow = Pick<
  Tables<"listing_translations">,
  "locale" | "title" | "description"
>;

/* A listings row read with its translations embedded:
   `.select("*, listing_translations(*)")`. Optional so the narrower selects
   (and fixtures) still satisfy the type. */
type ListingRowWithText = ListingRow & {
  listing_translations?: TranslationRow[] | null;
};

/** The `select` every listing read uses: the row plus its translations, which
    is exactly the shape toListing expects. Kept as one constant so a new read
    can't quietly omit the embed and serve base copy to every locale — the
    kind of bug that looks like "the translation didn't save". A single FK
    joins the two tables, so unlike `virtual_tour_scenes` no disambiguation is
    needed. */
export const LISTING_SELECT = "*, listing_translations(*)";

/* Embedded translation rows → the domain's `i18n` map. Blank strings are
   dropped rather than carried: localizeListing treats them as absent anyway,
   and keeping them would ship empty strings to the client on every listing.
   A locale left with nothing at all is omitted entirely. */
function toI18n(
  rows: TranslationRow[] | null | undefined
): Record<string, ListingText> | undefined {
  if (!rows?.length) return undefined;

  const i18n: Record<string, ListingText> = {};
  for (const row of rows) {
    const text: ListingText = {};
    if (row.title?.trim()) text.title = row.title;
    if (row.description?.trim()) text.desc = row.description;
    if (text.title || text.desc) i18n[row.locale] = text;
  }
  return Object.keys(i18n).length ? i18n : undefined;
}

/* DB stores listing types as lowercase enum slugs; the UI shows the
   capitalized labels from schemas/listing TYPES. */
const TYPE_LABELS: Record<ListingRow["type"], string> = {
  studio: "Studio",
  apartment: "Apartment",
  loft: "Loft",
  townhouse: "Townhouse",
  house: "House",
};

/* Reverse of TYPE_LABELS: UI label → DB enum slug, for writes. */
const TYPE_SLUGS = Object.fromEntries(
  Object.entries(TYPE_LABELS).map(([slug, label]) => [label, slug])
) as Record<string, ListingRow["type"]>;

/* Costs & terms columns → the domain's nested `costs`, or undefined when
   the row has none of them (legacy rows, owners who skipped the section). */
function toCosts(row: ListingRow): ListingCosts | undefined {
  const costs: ListingCosts = {
    deposit: row.deposit ?? undefined,
    depositAmount: row.deposit_amount ?? undefined,
    util: {
      electricity: row.util_electricity ?? undefined,
      water: row.util_water ?? undefined,
      wifi: row.util_wifi ?? undefined,
      building: row.util_building ?? undefined,
    },
    amt: {
      electricity: row.util_electricity_amount ?? undefined,
      water: row.util_water_amount ?? undefined,
      wifi: row.util_wifi_amount ?? undefined,
      building: row.util_building_amount ?? undefined,
    },
    minLease: row.min_lease_months ?? undefined,
  };
  return hasAnyCost(costs) ? costs : undefined;
}

/** Map a Supabase `listings` row to the app's domain `Listing`. Translations
    come along when the caller embedded them; a row read without them maps to
    a listing with base copy only, which renders identically in the base
    locale. */
export function toListing(row: ListingRowWithText): Listing {
  return {
    id: row.id,
    title: row.title,
    type: TYPE_LABELS[row.type] ?? row.type,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    area: row.area ?? 0,
    district: row.district as District,
    city: row.city,
    palette: row.palette,
    amenities: row.amenities,
    owner: row.owner_id,
    status: row.status,
    views: row.views,
    available: row.available_from ?? "now",
    desc: row.description,
    createdAt: row.created_at,
    images: row.images.length ? row.images : undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    costs: toCosts(row),
    // Trigger-owned, like `views` and `palette` — read here, never written by
    // toListingWrite below.
    hasVirtualTour: row.has_virtual_tour,
    baseLocale: row.base_locale,
    i18n: toI18n(row.listing_translations),
  };
}

/** Map the app's editable `ListingCore` + status to writable `listings`
    columns (create and edit share this). owner_id / palette / id / views are
    owned by the caller and set separately on insert. */
export function toListingWrite(
  core: ListingCore,
  status: Listing["status"]
): TablesUpdate<"listings"> {
  return {
    title: core.title,
    type: TYPE_SLUGS[core.type] ?? (core.type as ListingRow["type"]),
    price: core.price,
    beds: core.beds,
    baths: core.baths,
    area: core.area,
    district: core.district,
    city: core.city,
    amenities: core.amenities as ListingRow["amenities"],
    images: core.images ?? [],
    status,
    // "now" means immediately available → no stored date.
    available_from:
      core.available && core.available !== "now" ? core.available : null,
    description: core.desc,
    lat: core.lat ?? null,
    lng: core.lng ?? null,
    // Costs & terms — explicit nulls so clearing a field in the form
    // clears the column on edit.
    deposit: core.costs?.deposit ?? null,
    deposit_amount: core.costs?.depositAmount ?? null,
    util_electricity: core.costs?.util.electricity ?? null,
    util_electricity_amount: core.costs?.amt.electricity ?? null,
    util_water: core.costs?.util.water ?? null,
    util_water_amount: core.costs?.amt.water ?? null,
    util_wifi: core.costs?.util.wifi ?? null,
    util_wifi_amount: core.costs?.amt.wifi ?? null,
    util_building: core.costs?.util.building ?? null,
    util_building_amount: core.costs?.amt.building ?? null,
    min_lease_months: core.costs?.minLease ?? null,
    /* Omitted rather than defaulted when the caller doesn't name one: the
       column already has a default for inserts, and on update writing a
       guess would relabel copy the owner didn't touch. */
    ...(core.baseLocale ? { base_locale: core.baseLocale } : {}),
  };
}

/* A row on its way in. Both text columns are always stated — explicitly null
   when blank — so the same value can be handed to toListing without a re-read
   after the write. */
export type TranslationWrite = TablesInsert<"listing_translations"> &
  TranslationRow;

/** The `listing_translations` rows a `ListingCore` asks for — the complete
    desired state of a listing's non-base copy, which is what lets the service
    treat a locale that isn't here as one the owner cleared.

    Two things are dropped rather than written:

    - the base locale, whose copy lives in `listings.title`/`description`. A
      row for it would be a second, divergent source of truth for the same
      text.
    - entries blank in both fields, which the table's `not_empty` constraint
      rejects — the check exists to catch exactly this, and we never want to
      be the one who trips it. */
export function toTranslationRows(
  listingId: string,
  core: ListingCore
): TranslationWrite[] {
  const rows: TranslationWrite[] = [];
  for (const [locale, text] of Object.entries(core.i18n ?? {})) {
    if (locale === (core.baseLocale ?? DEFAULT_BASE_LOCALE)) continue;
    const title = text?.title?.trim() ? text.title : null;
    const description = text?.desc?.trim() ? text.desc : null;
    if (!title && !description) continue;
    rows.push({ listing_id: listingId, locale, title, description });
  }
  return rows;
}
