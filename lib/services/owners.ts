import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { type Owner } from "@/schemas/owner";
import type { Tables } from "@/lib/database.types";

/* ============================================================
   Owners service — resolves the host shown on the listing detail
   and owner pages.

   Owners are `profiles` rows, addressed by their auth uuid.
   profiles is anon-readable (RLS `profiles_select_public`), so the
   cookieless public client works inside a "use cache" boundary.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache tag covering every cached read of one profiles row, so a rename
    expires the owner page, its metadata and the name lookup together. Owned
    here and imported by the write path (lib/actions/profiles.ts), the same way
    reviewsTag couples the review write to the review reads. */
export const ownerTag = (id: string) => `owner:${id}`;

type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "name" | "bio" | "palette" | "created_at"
>;

/* Profiles only carry name/bio/palette/joined. The remaining host-stats
   fields have no DB backing yet, so fill them with neutral defaults so the
   owner page's badges and stat grid still render. */
function profileToOwner(row: ProfileRow): Owner {
  return {
    key: row.id,
    name: row.name || "Host",
    palette: row.palette,
    joined: row.created_at.slice(0, 7), // ISO timestamp → "YYYY-MM"
    verified: true,
    superhost: false,
    responseRate: 100,
    responseTime: "within a day",
    languages: ["Vietnamese", "English"],
    bio: row.bio,
  };
}

/** Resolve an owner by profile uuid. Returns null when the id isn't a uuid
    or has no row (e.g. a deleted user). */
export async function getOwnerProfile(id: string): Promise<Owner | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ownerTag(id));

  if (!UUID_RE.test(id)) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, bio, palette, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load owner: ${error.message}`);
  return data ? profileToOwner(data) : null;
}

/** Just the display name, for the client-only spots that hold an owner id and
    nothing else (e.g. the renter's calendar export). Separate from
    getOwnerProfile so those callers don't pull a whole Owner across the wire,
    but on the same tag — one row, one invalidation. */
export async function getProfileName(id: string): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag(ownerTag(id));

  if (!UUID_RE.test(id)) return "";

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load profile name: ${error.message}`);
  return data?.name ?? "";
}
