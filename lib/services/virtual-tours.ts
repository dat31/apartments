import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_PANORAMAS_BUCKET } from "@/lib/supabase/storage";
import { toScene, toVirtualTour } from "@/lib/virtual-tour/tour-map";
import { pruneLinksTo } from "@/lib/virtual-tour/scene-graph";
import { HotspotSchema } from "@/schemas/virtual-tour";
import type { Hotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";
import type { Tables } from "@/lib/database.types";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Virtual tours service — the single read path for 360° tours.

   Rows come from `listing_virtual_tours` + `virtual_tour_scenes`
   (supabase/migrations/20260731120000_virtual_tours.sql); the pure
   row → domain mapping lives in lib/virtual-tour/tour-map.

   Reads go through the cookieless public client, like the listings
   service: a published tour on an active listing is anon-readable by
   RLS, and a cookie-bound client can't be used inside a cache
   boundary. That policy is also why "is the listing active?" is not
   re-checked here — the database refuses to hand over rows the
   visitor shouldn't see, rather than this code remembering to.

   Tagged "virtual-tours" *and* "listings": a tour is its own row now,
   but publishing one flips listings.has_virtual_tour, so the listing
   caches have to be invalidated with it.
   ============================================================ */

/* PostgREST needs the foreign key named here. There are two between these
   tables — scenes.tour_id and tours.entry_scene_id — so an unqualified embed
   is ambiguous and fails at runtime. */
const TOUR_WITH_SCENES =
  "*, virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)";

/** The published tour for a listing, or null when it has none (or the
    listing itself isn't visible). */
export async function getVirtualTour(listingId: string): Promise<VirtualTour | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  cacheTag("virtual-tours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select(TOUR_WITH_SCENES)
    .eq("listing_id", listingId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`Failed to load virtual tour: ${error.message}`);
  if (!data) return null;

  const { virtual_tour_scenes: scenes, ...tour } = data;
  return toVirtualTour(tour, scenes);
}

/** Ids of every listing with a published tour. Feeds generateStaticParams for
    the tour route, so those pages prerender alongside the detail pages they
    hang off. */
export async function getListingIdsWithTour(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  cacheTag("virtual-tours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select("listing_id")
    .eq("status", "published");

  if (error) throw new Error(`Failed to load virtual tours: ${error.message}`);
  return (data ?? []).map((row) => row.listing_id);
}

/* ============================================================
   The owner's editing path.

   Everything below is cookie-bound and uncached: an owner edits
   a draft, which is exactly what the cached reads above refuse
   to serve. The row → domain mapping is shared with them.

   Each entry point names the listing, and every write starts by
   proving the caller owns it. RLS says the same thing, but the
   scene tables are addressed by scene id — so without the check
   an owner of *any* listing could patch a scene id belonging to
   someone else's tour and rely on RLS having been written
   correctly. Here it is stated, once, in requireTourOwner.

   The multi-step edits (add a room, delete a room and repair the
   doors that pointed at it, reorder) were previously four to N
   browser round trips each; they are now one call.
   ============================================================ */

type SceneRow = Tables<"virtual_tour_scenes">;

/** The scene fields an owner can edit. */
export type SceneDraft = {
  name: string;
  room: Scene["room"];
  panoramaUrl: string;
  previewUrl: string;
};

/** The patch shape the scene editor sends. */
export type ScenePatch = Partial<
  Pick<SceneRow, "name" | "room" | "yaw" | "pitch" | "hfov">
> & { hotspots?: Hotspot[] };

/** `updated_at` has no trigger (see the migration), so every write sets it. */
const touched = () => ({ updated_at: new Date().toISOString() });

/** The caller's own tour for a listing — draft included. */
export async function getOwnedTour(
  listingId: string
): Promise<VirtualTour | null> {
  await requireUser();

  const supabase = await createClient();
  // No status filter: the owner is editing, and a draft is the normal case.
  // RLS is the guard on a read — there is nothing to leak beyond what it
  // already scopes, and skipping the ownership query keeps the editor's first
  // paint to one round trip.
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select(TOUR_WITH_SCENES)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  if (!data) return null;

  const { virtual_tour_scenes: scenes, ...tour } = data;
  return toVirtualTour(tour, scenes);
}

/** Append a room to the tour, creating the tour row on first use. */
export async function addScene(
  listingId: string,
  draft: SceneDraft
): Promise<void> {
  const tourId = await ensureTour(listingId);
  const supabase = await createClient();

  // Append: one past the current last room.
  const { data: last } = await supabase
    .from("virtual_tour_scenes")
    .select("sort_order")
    .eq("tour_id", tourId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("virtual_tour_scenes").insert({
    tour_id: tourId,
    name: draft.name,
    room: draft.room,
    panorama_url: draft.panoramaUrl,
    preview_url: draft.previewUrl,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) {
    console.error("[virtual-tours] scene insert failed", error);
    throw new ServiceError("failed", error.message);
  }

  await supabase
    .from("listing_virtual_tours")
    .update(touched())
    .eq("id", tourId);
}

/** Patch one room of the caller's tour. */
export async function updateScene(
  listingId: string,
  sceneId: string,
  patch: ScenePatch
): Promise<void> {
  const tourId = await requireTourOwner(listingId);

  /* The column check only proves the value is a JSON array. Parsing here is
     what stops a half-built marker — a door with no target, a note with no
     body — reaching a renter's tour. */
  const { hotspots, ...rest } = patch;
  const row = {
    ...rest,
    ...(hotspots
      ? {
          hotspots: HotspotSchema.array().parse(
            hotspots
          ) as SceneRow["hotspots"],
        }
      : {}),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_tour_scenes")
    .update(row)
    .eq("id", sceneId)
    // The scene must belong to *this* tour, not merely exist.
    .eq("tour_id", tourId)
    .select("id");

  if (error) {
    console.error("[virtual-tours] scene update failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");

  await touchTour(tourId);
}

/**
 * Delete a room, and repair the rooms it breaks.
 *
 * A door in a *sibling* room pointing at the room going away is a blocking
 * publish issue the owner never placed and cannot see from the editor — so the
 * links are pruned in the same operation rather than discovered later. The
 * "before" state is read from the database rather than taken from the client,
 * so a stale editor cache can't decide which doors survive.
 */
export async function removeScene(
  listingId: string,
  sceneId: string
): Promise<void> {
  const tourId = await requireTourOwner(listingId);
  const supabase = await createClient();

  const { data: rows, error: readError } = await supabase
    .from("virtual_tour_scenes")
    .select("*")
    .eq("tour_id", tourId);
  if (readError) throw new ServiceError("failed", readError.message);

  const target = (rows ?? []).find((row) => row.id === sceneId);
  if (!target) throw new ServiceError("not-found");

  const { error } = await supabase
    .from("virtual_tour_scenes")
    .delete()
    .eq("id", sceneId)
    .eq("tour_id", tourId);
  if (error) {
    console.error("[virtual-tours] scene delete failed", error);
    throw new ServiceError("failed", error.message);
  }

  const before = (rows ?? [])
    .map(toScene)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const pruned = pruneLinksTo(before, sceneId);
  if (pruned !== before) {
    // Only the rooms that actually changed: pruneLinksTo keeps the identity of
    // the ones it didn't touch.
    const writes = pruned
      .filter((next, i) => next !== before[i] && next.id !== sceneId)
      .map((next) =>
        supabase
          .from("virtual_tour_scenes")
          .update({ hotspots: next.hotspots as SceneRow["hotspots"] })
          .eq("id", next.id)
          .eq("tour_id", tourId)
      );
    const failed = (await Promise.all(writes)).find((r) => r.error);
    if (failed?.error) throw new ServiceError("failed", failed.error.message);
  }

  await touchTour(tourId);
  // The row is gone; the objects behind it are ours to clean up. Best effort —
  // a leaked object costs storage, a throw costs the edit.
  await deletePanoramaObjects(target.panorama_url, target.preview_url);
}

/** Persist a whole new order. `sort_order` is rewritten from the array index,
    so the list the owner sees is the stored truth. */
export async function reorderScenes(
  listingId: string,
  sceneIds: string[]
): Promise<void> {
  const tourId = await requireTourOwner(listingId);
  const supabase = await createClient();

  const results = await Promise.all(
    sceneIds.map((id, index) =>
      supabase
        .from("virtual_tour_scenes")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("tour_id", tourId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new ServiceError("failed", failed.error.message);

  await touchTour(tourId);
}

/** Set the room a visitor lands in. */
export async function setEntryScene(
  listingId: string,
  sceneId: string
): Promise<void> {
  const tourId = await ensureTour(listingId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_virtual_tours")
    .update({ entry_scene_id: sceneId, ...touched() })
    .eq("id", tourId);
  if (error) throw new ServiceError("failed", error.message);
}

/** Publish or unpublish. The trigger on the table maintains
    listings.has_virtual_tour from here, so nothing else has to. */
export async function setTourStatus(
  listingId: string,
  status: VirtualTour["status"]
): Promise<void> {
  const tourId = await ensureTour(listingId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_virtual_tours")
    .update({ status, ...touched() })
    .eq("id", tourId);
  if (error) throw new ServiceError("failed", error.message);
}

/* ---- internals ---- */

/** Assert the caller owns `listingId`, and return its existing tour id. */
async function requireTourOwner(listingId: string): Promise<string> {
  await assertListingOwner(listingId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select("id")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  if (!data) throw new ServiceError("not-found");
  return data.id;
}

/** The tour row for a listing the caller owns, created on first use. Every
    mutation funnels through here or requireTourOwner, so the editor never has
    to think about whether the tour exists yet. */
async function ensureTour(listingId: string): Promise<string> {
  await assertListingOwner(listingId);

  const supabase = await createClient();
  const existing = await supabase
    .from("listing_virtual_tours")
    .select("id")
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing.error) throw new ServiceError("failed", existing.error.message);
  if (existing.data) return existing.data.id;

  const created = await supabase
    .from("listing_virtual_tours")
    .insert({ listing_id: listingId, status: "draft" })
    .select("id")
    .single();
  if (created.error) {
    console.error("[virtual-tours] tour insert failed", created.error);
    throw new ServiceError("failed", created.error.message);
  }
  return created.data.id;
}

/** A tour is only editable by the owner of the listing it hangs off. */
async function assertListingOwner(listingId: string): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  if (!data) throw new ServiceError("forbidden");
}

async function touchTour(tourId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("listing_virtual_tours")
    .update(touched())
    .eq("id", tourId);
}

/** Best-effort removal of a scene's objects. Never throws: a leaked object
    costs storage, a thrown error costs the owner their edit. Paths outside the
    bucket (the seeded demo rooms live in /panoramas, served by the app) are
    skipped. Server-side twin of deletePanorama in lib/supabase/storage. */
async function deletePanoramaObjects(
  ...urls: (string | null | undefined)[]
): Promise<void> {
  const marker = `/${LISTING_PANORAMAS_BUCKET}/`;
  const paths = urls
    .filter((url): url is string => Boolean(url) && url!.includes(marker))
    .map((url) => url.slice(url.indexOf(marker) + marker.length));
  if (!paths.length) return;

  try {
    const supabase = await createClient();
    await supabase.storage.from(LISTING_PANORAMAS_BUCKET).remove(paths);
  } catch (error) {
    console.error("[virtual-tours] panorama cleanup failed", error);
  }
}
