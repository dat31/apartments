import type { Tables, TablesUpdate } from "@/lib/database.types";
import {
  District,
  type Listing,
  type ListingCore,
  type ListingCosts,
} from "@/schemas/listing";
import { hasAnyCost } from "@/lib/listing-costs";

/* Pure row → domain mapping for `listings`, split out of the server-only
   listings service so it can be reused by client-side reads (e.g. the saved
   page fetches active listings straight from the browser Supabase client).
   No `server-only`, no cache, no React — just data. */

type ListingRow = Tables<"listings">;

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

/* Seed owners get stable uuids so the (still seed-backed) owner/review
   pages keep resolving by their "you"/"maya"/"leo" keys. Unknown owners
   fall back to their raw uuid. Keep in sync with the seed migration. */
export const OWNER_ID_BY_KEY: Record<string, string> = {
  you: "11111111-1111-1111-1111-111111111111",
  maya: "22222222-2222-2222-2222-222222222222",
  leo: "33333333-3333-3333-3333-333333333333",
};

export const OWNER_KEY_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(OWNER_ID_BY_KEY).map(([key, id]) => [id, key])
);

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

/** Map a Supabase `listings` row to the app's domain `Listing`. */
export function toListing(row: ListingRow): Listing {
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
    owner: OWNER_KEY_BY_ID[row.owner_id] ?? row.owner_id,
    status: row.status,
    views: row.views,
    available: row.available_from ?? "now",
    desc: row.description,
    createdAt: row.created_at,
    images: row.images.length ? row.images : undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    costs: toCosts(row),
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
  };
}
