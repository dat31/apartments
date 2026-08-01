"use server";

import {
  saveSearchInputSchema,
  type SavedSearch,
  type SaveSearchInput,
} from "@/schemas/saved-search";
import {
  createSavedSearch,
  deleteSavedSearch,
  listMySavedSearches,
  setSavedSearchAlerts,
} from "@/lib/services/saved-searches";
import { toResult, type ActionResult } from "./result";

/* Saved-search entry points. Per-user data with no cached read behind it, so
   nothing here expires a server cache — react-query invalidation on the client
   is the whole story. */

export async function fetchMySavedSearches(): Promise<
  ActionResult<SavedSearch[]>
> {
  return toResult(listMySavedSearches);
}

export async function createSavedSearchAction(
  input: SaveSearchInput
): Promise<ActionResult> {
  const parsed = saveSearchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => createSavedSearch(parsed.data));
}

export async function setSavedSearchAlertsAction(
  id: string,
  alerts: boolean
): Promise<ActionResult> {
  return toResult(() => setSavedSearchAlerts(id, alerts));
}

export async function deleteSavedSearchAction(
  id: string
): Promise<ActionResult> {
  return toResult(() => deleteSavedSearch(id));
}
