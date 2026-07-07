import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { type Owner } from "@/schemas/owner";
import { getOwner as getSeedOwner } from "@/lib/data/listings";
import type { Tables } from "@/lib/database.types";

/* ============================================================
   Owners service — resolves the host shown on the listing detail
   and owner pages. Owners come from two places:

   • Seed owners ("you"/"maya"/"leo") keep their curated OWNERS
     profiles from @/lib/data/listings.
   • Real signed-up owners live in the `profiles` table, keyed by
     their auth uuid. profiles is anon-readable (RLS
     `profiles_select_public`), so the cookieless public client
     works inside a "use cache" boundary.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "name" | "location" | "bio" | "palette" | "created_at"
>;

/* Real profiles only carry name/location/bio/palette/joined. The remaining
   host-stats fields have no DB backing yet, so fill them with neutral
   defaults so the owner page's badges and stat grid still render. */
function profileToOwner(row: ProfileRow): Owner {
  return {
    key: row.id,
    name: row.name || "Host",
    palette: row.palette,
    joined: row.created_at.slice(0, 7), // ISO timestamp → "YYYY-MM"
    location: row.location,
    verified: true,
    superhost: false,
    responseRate: 100,
    responseTime: "within a day",
    languages: ["Vietnamese", "English"],
    bio: row.bio,
  };
}

/** Resolve an owner by seed key ("you"/"maya"/"leo") or by a real profile
    uuid. Returns null when neither matches (e.g. a deleted user). */
export async function getOwnerProfile(id: string): Promise<Owner | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`owner:${id}`);

  const seed = getSeedOwner(id);
  if (seed) return seed;

  if (!UUID_RE.test(id)) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, location, bio, palette, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load owner: ${error.message}`);
  return data ? profileToOwner(data) : null;
}
