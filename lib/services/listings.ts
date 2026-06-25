import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/database.types";
import { District, type Listing } from "@/schemas/listing";

/* ============================================================
   Listings service — the single read path between Supabase and
   the app's domain `Listing` type. Components never talk to the
   DB directly; they call these functions and receive domain
   objects, so the rest of the app stays unaware of column names,
   enum casing, and FK ids.
   ============================================================ */

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
function toListing(row: ListingRow): Listing {
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

/** All active listings, oldest first. Cached across requests via "use cache";
    invalidate with revalidateTag("listings") when a listing changes. Uses the
    cookieless public client since active listings are anon-readable (RLS) — a
    cookie-bound client can't be used inside a cache boundary. */
export async function getActiveListings(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []).map(toListing);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A single listing by id, or null if not found / not accessible.
    RLS only exposes active listings to anonymous visitors. Non-uuid ids
    (e.g. legacy seed ids) return null so callers can fall back. */
export async function getListingById(id: string): Promise<Listing | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `listing:${id}`);

  if (!UUID_RE.test(id)) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data ? toListing(data) : null;
}
