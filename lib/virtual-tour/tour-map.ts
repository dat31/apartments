import { HotspotSchema } from "@/schemas/virtual-tour";
import type { Hotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";
import type { Tables } from "@/lib/database.types";

/* Pure row → domain mapping for the two virtual-tour tables, split out of the
   server-only service the way listings-map.ts is split out of listings.ts:
   no `server-only`, no cache, no React — just data.

   The read path is deliberately forgiving. A tour is content an owner
   authored, and half a tour is worth more to a renter than an error page, so
   every defect below degrades instead of throwing:

     · a scene whose hotspots don't parse keeps the room, loses the markers
     · an individual bad hotspot is dropped, its siblings survive
     · an entry_scene_id pointing nowhere falls back to the first room

   What it does NOT do is repair the graph. A door leading to a deleted room
   still renders (disabled by the viewer, which checks sceneById before
   navigating) — validateTourGraph is the write-time gate, and phase 3's
   authoring UI is where a dangling door should be refused. */

type TourRow = Tables<"listing_virtual_tours">;
type SceneRow = Tables<"virtual_tour_scenes">;

/** Hotspots come back as `Json`. Parse each one on its own so a single bad
    marker costs one marker rather than the whole room. */
function toHotspots(value: SceneRow["hotspots"]): Hotspot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const parsed = HotspotSchema.safeParse(raw);
    return parsed.success ? [parsed.data] : [];
  });
}

export function toScene(row: SceneRow): Scene {
  return {
    id: row.id,
    name: row.name,
    room: row.room,
    panorama: row.panorama_url,
    // The preview is optional in the DB but not in the viewer, which paints
    // it first and uses it for the rail thumbnail; the full panorama is the
    // honest fallback (bigger, but never a broken image).
    preview: row.preview_url ?? row.panorama_url,
    yaw: row.yaw,
    pitch: row.pitch,
    sortOrder: row.sort_order,
    hotspots: toHotspots(row.hotspots),
  };
}

/** Map a tour row and its scene rows to the domain `VirtualTour`, or null
    when the tour has no scenes at all — there is nothing to stand in. */
export function toVirtualTour(
  row: TourRow,
  sceneRows: SceneRow[]
): VirtualTour | null {
  const scenes = sceneRows
    .map(toScene)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!scenes.length) return null;

  const entry = scenes.find((scene) => scene.id === row.entry_scene_id);

  return {
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    // Null (or stale) entry_scene_id means "start at the first room" — the
    // column is the owner's preference, not a requirement.
    entryScene: (entry ?? scenes[0]).id,
    scenes,
  };
}
