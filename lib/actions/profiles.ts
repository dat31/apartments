"use server";

import { updateTag } from "next/cache";
import { profilePatchSchema, type Profile, type ProfilePatch } from "@/schemas/profile";
import { getMyProfile, updateMyProfile } from "@/lib/services/profiles";
import { getProfileName, ownerTag } from "@/lib/services/owners";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Profile entry points.

   Thin by design: validate, delegate, invalidate. Every rule
   that decides *which* row is touched lives in the service, so
   there is no id in any of these signatures for a direct POST to
   forge — the session decides.
   ============================================================ */

/** The signed-in user's own profile. */
export async function fetchMyProfile(): Promise<ActionResult<Profile>> {
  return toResult(getMyProfile);
}

/** Another user's display name. Public — `profiles` is anon-readable. */
export async function fetchProfileName(
  id: string
): Promise<ActionResult<string>> {
  return toResult(() => getProfileName(id));
}

/** Patch the signed-in user's own profile. */
export async function saveMyProfile(
  patch: ProfilePatch
): Promise<ActionResult> {
  const parsed = profilePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await toResult(() => updateMyProfile(parsed.data));
  if (!result.ok) return result;

  /* The public owner page, its metadata and the name lookup all read through
     owner:<id>-tagged caches. Before this, a rename only ever invalidated
     react-query, so those kept serving the old name for the full cacheLife. */
  updateTag(ownerTag(result.data));
  return { ok: true, data: undefined };
}
