import { describe, expect, it } from "vitest";
import { canPublish, isBlocking, partitionIssues } from "@/lib/virtual-tour/publish";
import { validateTourGraph } from "@/lib/virtual-tour/scene-graph";
import type { TourIssue } from "@/lib/virtual-tour/scene-graph";
import { makeScene, makeVirtualTour } from "@/tests/factories";

describe("isBlocking", () => {
  it("blocks on a tour that would misbehave for a renter", () => {
    const fatal: TourIssue[] = [
      { code: "no-scenes" },
      { code: "entry-missing", sceneId: "a" },
      { code: "duplicate-scene", sceneId: "a" },
      { code: "self-link", sceneId: "a", hotspotId: "h" },
      { code: "dangling-link", sceneId: "a", hotspotId: "h", target: "gone" },
    ];
    expect(fatal.every(isBlocking)).toBe(true);
  });

  it("does not block on an unreachable room", () => {
    // The room rail reaches every room, so "no door leads here yet" is a
    // note, not a defect.
    expect(isBlocking({ code: "unreachable-scene", sceneId: "b" })).toBe(false);
  });
});

describe("partitionIssues", () => {
  it("splits and preserves order within each list", () => {
    const { blocking, advisory } = partitionIssues([
      { code: "unreachable-scene", sceneId: "b" },
      { code: "entry-missing", sceneId: "x" },
      { code: "unreachable-scene", sceneId: "c" },
    ]);
    expect(blocking.map((i) => i.code)).toEqual(["entry-missing"]);
    expect(advisory.map((i) => "sceneId" in i && i.sceneId)).toEqual(["b", "c"]);
  });
});

describe("canPublish", () => {
  it("lets a rooms-only tour go live — the case PR A creates", () => {
    // Three rooms, no doors between them: every non-entry room comes back
    // unreachable, and that must not stop an owner publishing.
    const tour = makeVirtualTour({
      entryScene: "living",
      scenes: [
        makeScene({ id: "living", sortOrder: 0, hotspots: [] }),
        makeScene({ id: "kitchen", sortOrder: 1, hotspots: [] }),
        makeScene({ id: "bath", sortOrder: 2, hotspots: [] }),
      ],
    });
    const issues = validateTourGraph(tour);

    expect(issues.some((i) => i.code === "unreachable-scene")).toBe(true);
    expect(canPublish(issues)).toBe(true);
  });

  it("refuses a tour with no rooms", () => {
    expect(canPublish(validateTourGraph(makeVirtualTour({ scenes: [] })))).toBe(false);
  });

  it("refuses when the entry room isn't in the tour", () => {
    const tour = makeVirtualTour({
      entryScene: "deleted",
      scenes: [makeScene({ id: "living", sortOrder: 0, hotspots: [] })],
    });
    expect(canPublish(validateTourGraph(tour))).toBe(false);
  });
});
