import { describe, expect, it } from "vitest";
import { toScene, toVirtualTour } from "@/lib/virtual-tour/tour-map";
import type { Tables } from "@/lib/database.types";

/* The mapper's job is to be forgiving: rows are owner-authored content, and
   half a tour beats an error page. These tests are mostly about what it
   refuses to throw on. */

type SceneRow = Tables<"virtual_tour_scenes">;
type TourRow = Tables<"listing_virtual_tours">;

const sceneRow = (over: Partial<SceneRow> = {}): SceneRow => ({
  id: "scene-1",
  tour_id: "tour-1",
  name: "Living room",
  room: "living",
  panorama_url: "/panoramas/living-room.jpg",
  preview_url: "/panoramas/living-room-preview.jpg",
  yaw: 0.3,
  pitch: 0,
  hfov: null,
  sort_order: 0,
  plan_x: null,
  plan_y: null,
  hotspots: [],
  created_at: "2026-07-31T00:00:00Z",
  ...over,
});

const tourRow = (over: Partial<TourRow> = {}): TourRow => ({
  id: "tour-1",
  listing_id: "listing-1",
  status: "published",
  entry_scene_id: null,
  created_at: "2026-07-31T00:00:00Z",
  updated_at: "2026-07-31T00:00:00Z",
  ...over,
});

const link = { id: "h1", kind: "link", yaw: 1, pitch: 0, label: "Kitchen", target: "scene-2" };
const info = { id: "h2", kind: "info", yaw: 2, pitch: 0, label: "View", body: "Sea." };

describe("toScene", () => {
  it("maps a row to the domain scene", () => {
    const scene = toScene(sceneRow({ hotspots: [link, info] }));
    expect(scene).toMatchObject({
      id: "scene-1",
      name: "Living room",
      room: "living",
      panorama: "/panoramas/living-room.jpg",
      preview: "/panoramas/living-room-preview.jpg",
      yaw: 0.3,
      sortOrder: 0,
    });
    expect(scene.hotspots).toHaveLength(2);
  });

  it("falls back to the panorama when there is no preview", () => {
    // Bigger to paint, but never a broken image.
    expect(toScene(sceneRow({ preview_url: null })).preview).toBe(
      "/panoramas/living-room.jpg"
    );
  });

  it("drops only the hotspots that don't parse", () => {
    const scene = toScene(
      sceneRow({
        hotspots: [
          link,
          { id: "bad", kind: "link", yaw: 0, pitch: 0, label: "Nowhere" }, // no target
          { kind: "info", yaw: 0, pitch: 0, label: "No id", body: "x" },
          info,
        ],
      })
    );
    expect(scene.hotspots.map((h) => h.id)).toEqual(["h1", "h2"]);
  });

  it("survives hotspots that aren't an array at all", () => {
    expect(toScene(sceneRow({ hotspots: { nope: true } })).hotspots).toEqual([]);
  });
});

describe("toVirtualTour", () => {
  const scenes = [
    sceneRow({ id: "b", sort_order: 1, name: "Kitchen" }),
    sceneRow({ id: "a", sort_order: 0, name: "Living room" }),
  ];

  it("orders scenes by sort_order regardless of row order", () => {
    const tour = toVirtualTour(tourRow(), scenes);
    expect(tour?.scenes.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("uses entry_scene_id when it points at a real scene", () => {
    expect(toVirtualTour(tourRow({ entry_scene_id: "b" }), scenes)?.entryScene).toBe("b");
  });

  it("falls back to the first room when the entry scene is null or stale", () => {
    expect(toVirtualTour(tourRow(), scenes)?.entryScene).toBe("a");
    expect(
      toVirtualTour(tourRow({ entry_scene_id: "deleted" }), scenes)?.entryScene
    ).toBe("a");
  });

  it("is null when the tour has no scenes — there is nothing to stand in", () => {
    expect(toVirtualTour(tourRow(), [])).toBeNull();
  });

  it("carries the tour's identity and status through", () => {
    expect(toVirtualTour(tourRow(), scenes)).toMatchObject({
      id: "tour-1",
      listingId: "listing-1",
      status: "published",
    });
  });
});
