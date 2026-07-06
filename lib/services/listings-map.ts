import type { Tables } from "@/lib/database.types";
import { District, type Listing } from "@/schemas/listing";

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

/* Seed owners get stable uuids so the (still seed-backed) owner/review
   pages keep resolving by their "you"/"maya"/"leo" keys. Unknown owners
   fall back to their raw uuid. Keep in sync with the seed migration. */
const OWNER_KEY_BY_ID: Record<string, string> = {
  "11111111-1111-1111-1111-111111111111": "you",
  "22222222-2222-2222-2222-222222222222": "maya",
  "33333333-3333-3333-3333-333333333333": "leo",
};

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
    images: row.images.length ? row.images : undefined,
  };
}
