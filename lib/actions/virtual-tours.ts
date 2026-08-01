"use server";

import { updateTag } from "next/cache";
import { HotspotSchema, type VirtualTour } from "@/schemas/virtual-tour";
import {
  addScene,
  getOwnedTour,
  removeScene,
  reorderScenes,
  setEntryScene,
  setTourStatus,
  updateScene,
  type SceneDraft,
  type ScenePatch,
} from "@/lib/services/virtual-tours";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   360° tour editing entry points.

   Both tags on every write, deliberately: "virtual-tours" covers
   getVirtualTour / getListingIdsWithTour, and "listings" because
   publishing flips listings.has_virtual_tour, which the browse
   cards and the detail page's entry button read off the cached
   listing rows.

   This replaces `revalidateVirtualTour()`, which any signed-in
   user could call to flush both tags site-wide. Invalidation is
   now a consequence of a write that succeeded.
   ============================================================ */

function expireTourCaches() {
  updateTag("virtual-tours");
  updateTag("listings");
}

/** The caller's own tour for a listing — draft included. */
export async function fetchOwnedTour(
  listingId: string
): Promise<ActionResult<VirtualTour | null>> {
  return toResult(() => getOwnedTour(listingId));
}

export async function addSceneAction(
  listingId: string,
  draft: SceneDraft
): Promise<ActionResult> {
  return afterWrite(await toResult(() => addScene(listingId, draft)));
}

export async function updateSceneAction(
  listingId: string,
  sceneId: string,
  patch: ScenePatch
): Promise<ActionResult> {
  // Parsed again in the service before it reaches the column; doing it here
  // too means a malformed marker is an "invalid" the editor can report rather
  // than a thrown zod error flattened to "failed".
  if (patch.hotspots && !HotspotSchema.array().safeParse(patch.hotspots).success) {
    return { ok: false, error: "invalid" };
  }
  return afterWrite(
    await toResult(() => updateScene(listingId, sceneId, patch))
  );
}

export async function removeSceneAction(
  listingId: string,
  sceneId: string
): Promise<ActionResult> {
  return afterWrite(await toResult(() => removeScene(listingId, sceneId)));
}

export async function reorderScenesAction(
  listingId: string,
  sceneIds: string[]
): Promise<ActionResult> {
  return afterWrite(
    await toResult(() => reorderScenes(listingId, sceneIds))
  );
}

export async function setEntrySceneAction(
  listingId: string,
  sceneId: string
): Promise<ActionResult> {
  return afterWrite(
    await toResult(() => setEntryScene(listingId, sceneId))
  );
}

export async function setTourStatusAction(
  listingId: string,
  status: VirtualTour["status"]
): Promise<ActionResult> {
  return afterWrite(
    await toResult(() => setTourStatus(listingId, status))
  );
}

function afterWrite(result: ActionResult<void>): ActionResult {
  if (result.ok) expireTourCaches();
  return result;
}
