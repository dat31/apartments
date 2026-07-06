import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { type Listing } from "@/schemas/listing";
import { OWNER_ID_BY_KEY, toListing } from "./listings-map";

/* ============================================================
   Listings service — the single read path between Supabase and
   the app's domain `Listing` type. Components never talk to the
   DB directly; they call these functions and receive domain
   objects, so the rest of the app stays unaware of column names,
   enum casing, and FK ids.

   The pure row → domain mapping lives in ./listings-map so it can
   also run in the browser (see hooks/use-saved-listings).
   ============================================================ */

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

/** A seed owner's active listings, oldest first. Reads the real `listings`
    rows (uuid ids) so cards can be saved/shortlisted — unlike the seed data,
    whose "l1"-style ids have no matching row. Unknown owner keys yield []. */
export async function getListingsByOwner(ownerKey: string): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `owner-listings:${ownerKey}`);

  const ownerId = OWNER_ID_BY_KEY[ownerKey];
  if (!ownerId) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to load owner listings: ${error.message}`);
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
