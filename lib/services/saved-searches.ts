import "server-only";
import { createClient } from "@/lib/supabase/server";
import { type SavedSearch, type SaveSearchInput } from "@/schemas/saved-search";
import type { Tables } from "@/lib/database.types";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Saved searches — the signed-in renter's stored queries and
   their alert preferences.

   No guest mode: alerts need an email address, so saving is
   honestly gated on sign-in.

   All per-user, so nothing here is cached. The row → domain
   mapping stays in this file rather than a sibling *-map: unlike
   listings and tours, no browser code maps these rows any more.

   The per-account cap is enforced by the enforce_saved_search_cap
   trigger, not by counting here — a count-then-insert would race
   two tabs past the limit.
   ============================================================ */

function toSavedSearch(row: Tables<"saved_searches">): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    queryString: row.query_string,
    alerts: row.alerts,
    createdAt: row.created_at,
  };
}

/** The caller's saved searches, newest first. */
export async function listMySavedSearches(): Promise<SavedSearch[]> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? []).map(toSavedSearch);
}

/** Save a search for the caller. */
export async function createSavedSearch(
  input: SaveSearchInput
): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").insert({
    profile_id: user.id,
    name: input.name,
    query_string: input.queryString,
    alerts: input.alerts,
    // Alert emails are sent in the language the search was saved in.
    locale: input.locale,
  });

  if (error) {
    console.error("[saved-searches] insert failed", error);
    throw new ServiceError("failed", error.message);
  }
}

/** Turn alerts on or off for one of the caller's searches. */
export async function setSavedSearchAlerts(
  id: string,
  alerts: boolean
): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .update({ alerts })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id");

  if (error) {
    console.error("[saved-searches] alert toggle failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
}

/** Delete one of the caller's searches. */
export async function deleteSavedSearch(id: string): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id");

  if (error) {
    console.error("[saved-searches] delete failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
}
