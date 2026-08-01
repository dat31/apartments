import { describe, expect, it } from "vitest";
import {
  adjacency,
  isLink,
  orderedScenes,
  preloadOrder,
  sceneById,
  stepScene,
  validateTourGraph,
} from "@/lib/virtual-tour/scene-graph";
import { makeLink, makeScene, makeVirtualTour } from "@/tests/factories";

/* A four-room tour: living is the hub, bathroom hangs off the bedroom.
   living ↔ kitchen, living → bedroom → bathroom (one-way from living). */
const fourRooms = () =>
  makeVirtualTour({
    scenes: [
      makeScene({
        id: "living",
        sortOrder: 0,
        hotspots: [makeLink("kitchen"), makeLink("bedroom")],
      }),
      makeScene({ id: "kitchen", sortOrder: 1, hotspots: [makeLink("living")] }),
      makeScene({ id: "bedroom", sortOrder: 2, hotspots: [makeLink("bathroom")] }),
      makeScene({ id: "bathroom", sortOrder: 3, hotspots: [] }),
    ],
  });

describe("isLink", () => {
  it("narrows link hotspots away from info hotspots", () => {
    const spots = [
      makeLink("kitchen"),
      { id: "i", kind: "info" as const, yaw: 0, pitch: 0, label: "View", body: "Sea." },
    ];
    expect(spots.filter(isLink).map((h) => h.target)).toEqual(["kitchen"]);
  });
});

describe("orderedScenes", () => {
  it("sorts by sortOrder", () => {
    const scenes = [
      makeScene({ id: "b", sortOrder: 2 }),
      makeScene({ id: "a", sortOrder: 1 }),
    ];
    expect(orderedScenes(scenes).map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("breaks ties by id so the rail can't wobble between renders", () => {
    const scenes = [
      makeScene({ id: "z", sortOrder: 0 }),
      makeScene({ id: "a", sortOrder: 0 }),
    ];
    expect(orderedScenes(scenes).map((s) => s.id)).toEqual(["a", "z"]);
  });

  it("does not mutate the input", () => {
    const scenes = [makeScene({ id: "b", sortOrder: 2 }), makeScene({ id: "a", sortOrder: 1 })];
    orderedScenes(scenes);
    expect(scenes.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("sceneById", () => {
  it("finds a scene, and returns undefined for an unknown id", () => {
    const { scenes } = fourRooms();
    expect(sceneById(scenes, "kitchen")?.id).toBe("kitchen");
    expect(sceneById(scenes, "attic")).toBeUndefined();
  });
});

describe("adjacency", () => {
  it("maps each scene to the rooms its doors lead to", () => {
    const map = adjacency(fourRooms().scenes);
    expect(map.get("living")).toEqual(["kitchen", "bedroom"]);
    expect(map.get("bathroom")).toEqual([]);
  });

  it("drops links to scenes that aren't in the tour", () => {
    const scenes = [makeScene({ id: "living", hotspots: [makeLink("attic")] })];
    expect(adjacency(scenes).get("living")).toEqual([]);
  });

  it("drops a door back into its own room", () => {
    const scenes = [makeScene({ id: "living", hotspots: [makeLink("living")] })];
    expect(adjacency(scenes).get("living")).toEqual([]);
  });
});

describe("preloadOrder", () => {
  it("puts the rooms one door away first, then the rest, in rail order", () => {
    expect(preloadOrder(fourRooms().scenes, "living")).toEqual([
      "kitchen",
      "bedroom",
      "bathroom",
    ]);
  });

  it("never includes the room already on screen", () => {
    expect(preloadOrder(fourRooms().scenes, "bathroom")).not.toContain("bathroom");
  });

  it("falls back to rail order when the current room has no doors", () => {
    expect(preloadOrder(fourRooms().scenes, "bathroom")).toEqual([
      "living",
      "kitchen",
      "bedroom",
    ]);
  });
});

describe("stepScene", () => {
  const { scenes } = fourRooms();

  it("walks the rail forward and back", () => {
    expect(stepScene(scenes, "living", 1)?.id).toBe("kitchen");
    expect(stepScene(scenes, "kitchen", -1)?.id).toBe("living");
  });

  it("wraps around at both ends", () => {
    expect(stepScene(scenes, "bathroom", 1)?.id).toBe("living");
    expect(stepScene(scenes, "living", -1)?.id).toBe("bathroom");
  });

  it("falls back to the first room for an unknown id", () => {
    expect(stepScene(scenes, "attic", 1)?.id).toBe("living");
  });

  it("returns undefined when there is nothing to step through", () => {
    expect(stepScene([], "living", 1)).toBeUndefined();
  });
});

describe("validateTourGraph", () => {
  it("passes a well-formed tour", () => {
    expect(validateTourGraph(fourRooms())).toEqual([]);
  });

  it("reports a tour with no scenes at all", () => {
    const tour = makeVirtualTour({ scenes: [] });
    expect(validateTourGraph(tour)).toEqual([{ code: "no-scenes" }]);
  });

  it("reports an entry scene that isn't in the tour", () => {
    const tour = makeVirtualTour({ entryScene: "attic" });
    expect(validateTourGraph(tour)).toContainEqual({
      code: "entry-missing",
      sceneId: "attic",
    });
  });

  it("reports a door to a room that doesn't exist", () => {
    const tour = makeVirtualTour({
      scenes: [
        makeScene({ id: "living", hotspots: [makeLink("attic")] }),
        makeScene({ id: "bedroom", sortOrder: 1, hotspots: [makeLink("living")] }),
      ],
    });
    expect(validateTourGraph(tour)).toContainEqual({
      code: "dangling-link",
      sceneId: "living",
      hotspotId: "to-attic",
      target: "attic",
    });
  });

  it("reports a door back into the room it is in", () => {
    const tour = makeVirtualTour({
      scenes: [
        makeScene({ id: "living", hotspots: [makeLink("living"), makeLink("bedroom")] }),
        makeScene({ id: "bedroom", sortOrder: 1, hotspots: [makeLink("living")] }),
      ],
    });
    expect(validateTourGraph(tour)).toEqual([
      { code: "self-link", sceneId: "living", hotspotId: "to-living" },
    ]);
  });

  it("reports two scenes sharing an id", () => {
    const tour = makeVirtualTour({
      scenes: [
        makeScene({ id: "living", hotspots: [makeLink("bedroom")] }),
        makeScene({ id: "living", sortOrder: 1 }),
        makeScene({ id: "bedroom", sortOrder: 2, hotspots: [makeLink("living")] }),
      ],
    });
    expect(validateTourGraph(tour)).toContainEqual({
      code: "duplicate-scene",
      sceneId: "living",
    });
  });

  it("reports a room no door reaches", () => {
    const tour = makeVirtualTour({
      scenes: [
        makeScene({ id: "living", hotspots: [makeLink("bedroom")] }),
        makeScene({ id: "bedroom", sortOrder: 1, hotspots: [makeLink("living")] }),
        makeScene({ id: "attic", sortOrder: 2, hotspots: [] }),
      ],
    });
    expect(validateTourGraph(tour)).toEqual([
      { code: "unreachable-scene", sceneId: "attic" },
    ]);
  });

  it("accepts a one-way door — the room rail is always a way back", () => {
    // bedroom → bathroom with no return link. The renter isn't stuck: the
    // rail lists every room, so this is not an authoring error.
    expect(validateTourGraph(fourRooms())).toEqual([]);
  });

  it("reports every room as unreachable when the entry scene is missing", () => {
    const tour = makeVirtualTour({ entryScene: "attic" });
    const codes = validateTourGraph(tour).map((i) => i.code);
    expect(codes).toEqual(["entry-missing", "unreachable-scene", "unreachable-scene"]);
  });
});
