import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  DEFAULT_PROFILE,
  type Profile,
  type ProfilePatch,
  type Role,
} from "@/schemas/profile";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Profiles service — the per-request read path for `profiles`.

   Distinct from ./owners, which serves the *public owner page* as
   a rich `Owner` inside a "use cache" boundary. What lives here is
   the small, uncached lookup: the display identity of one or more
   accounts, needed fresh (a renamed account should show its new
   name on the next message, not in an hour).

   profiles is anon-readable (RLS `profiles_select_public`), so the
   cookieless public client is enough — no reason to parse a
   session cookie to read a public row.
   ============================================================ */

/** The public display identity of an account. Deliberately four fields: this
    is a DTO, and it crosses into Stream (and from there into chat avatars). */
export type ProfileSeed = {
  id: string;
  name: string;
  palette: number;
  verified: boolean;
};

/**
 * Display identity for a set of account ids, one seed per requested id in the
 * order given. Ids with no row still come back — as an unverified placeholder —
 * so callers can render a deleted account rather than crash on a hole.
 */
export async function getProfileSeeds(ids: string[]): Promise<ProfileSeed[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, palette")
    .in("id", unique);

  const rows = new Map((data ?? []).map((row) => [row.id, row]));
  return unique.map((id) => {
    const row = rows.get(id);
    return {
      id,
      name: row?.name?.trim() || "",
      palette: row?.palette ?? DEFAULT_PROFILE.palette,
      // Same rule as ./owners: having a profiles row is what "verified" means
      // in this app today.
      verified: !!row,
    };
  });
}

/* ---- the caller's own profile ----------------------------------------
   Cookie-bound, so never "use cache". The id is never a parameter: it comes
   from the verified session, which is what stops one account from reading or
   editing another's row regardless of what the payload claims. */

/**
 * The signed-in user's profile — the `profiles` row merged with the identity
 * that only the auth user carries (email, and the signup metadata the row
 * falls back to before the seeding trigger has run).
 */
export async function getMyProfile(): Promise<Profile> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("name, bio, palette, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);

  const meta = user.user_metadata ?? {};
  return {
    name: data?.name || (meta.name as string) || "",
    email: user.email ?? "",
    bio: data?.bio ?? "",
    palette: data?.palette ?? DEFAULT_PROFILE.palette,
    role: data?.role ?? (meta.role as Role) ?? DEFAULT_PROFILE.role,
  };
}

/**
 * Apply a patch to the caller's own row. Returns the id that changed so the
 * action can expire the cached public reads of it.
 *
 * An empty patch is a no-op rather than an error — `email` is the one field
 * callers may send that has nowhere to go.
 */
export async function updateMyProfile(patch: ProfilePatch): Promise<string> {
  const user = await requireUser();

  // Email lives on the auth user, not the profiles row.
  const { email: _email, ...fields } = patch;
  void _email;
  if (Object.keys(fields).length === 0) return user.id;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id);

  if (error) {
    console.error("[profiles] update failed", error);
    throw new ServiceError("failed", error.message);
  }
  return user.id;
}
