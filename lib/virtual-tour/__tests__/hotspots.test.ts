import { describe, expect, it } from "vitest";
import {
  countMarkers,
  describeYaw,
  doorLabel,
  inboundDoors,
  moveHotspot,
  normalizeDirection,
  nudgeHotspot,
  NUDGE_STEP,
  removeHotspot,
  upsertHotspot,
} from "@/lib/virtual-tour/hotspots";
import { MAX_PITCH } from "@/lib/virtual-tour/math";
import { makeLink, makeScene } from "@/tests/factories";
import type { Hotspot } from "@/schemas/virtual-tour";

const info = (overrides: Partial<Extract<Hotspot, { kind: "info" }>> = {}) =>
  ({
    id: "note-1",
    kind: "info" as const,
    yaw: 0,
    pitch: 0,
    label: "Balcony",
    body: "Morning sun.",
    ...overrides,
  }) satisfies Hotspot;

const deg = (d: number) => (d * Math.PI) / 180;

describe("normalizeDirection", () => {
  it("wraps a yaw past half a turn round the other way", () => {
    expect(normalizeDirection({ yaw: deg(190), pitch: 0 }).yaw).toBeCloseTo(deg(-170));
  });

  it("clamps a pitch to what the camera can look at", () => {
    expect(normalizeDirection({ yaw: 0, pitch: Math.PI / 2 }).pitch).toBeCloseTo(MAX_PITCH);
    expect(normalizeDirection({ yaw: 0, pitch: -Math.PI / 2 }).pitch).toBeCloseTo(-MAX_PITCH);
  });
});

describe("nudgeHotspot", () => {
  it("moves a marker by the step and keeps everything else", () => {
    const nudged = nudgeHotspot(makeLink("kitchen"), NUDGE_STEP, 0);
    expect(nudged.yaw).toBeCloseTo(NUDGE_STEP);
    expect(nudged.target).toBe("kitchen");
    expect(nudged.kind).toBe("link");
  });

  it("cannot nudge a marker to the pole", () => {
    const nudged = nudgeHotspot(info({ pitch: MAX_PITCH }), 0, deg(30));
    expect(nudged.pitch).toBeCloseTo(MAX_PITCH);
  });
});

describe("moveHotspot", () => {
  it("puts the marker at the new direction, normalized", () => {
    const moved = moveHotspot(info(), { yaw: deg(200), pitch: Math.PI });
    expect(moved.yaw).toBeCloseTo(deg(-160));
    expect(moved.pitch).toBeCloseTo(MAX_PITCH);
    expect(moved.body).toBe("Morning sun.");
  });
});

describe("upsertHotspot", () => {
  it("appends a marker that isn't there yet", () => {
    expect(upsertHotspot([], info()).map((h) => h.id)).toEqual(["note-1"]);
  });

  it("replaces in place, so an edited marker doesn't jump its own list", () => {
    const list: Hotspot[] = [info(), makeLink("kitchen"), info({ id: "note-2" })];
    const next = upsertHotspot(list, info({ label: "Renamed" }));
    expect(next.map((h) => h.id)).toEqual(["note-1", "to-kitchen", "note-2"]);
    expect(next[0].label).toBe("Renamed");
  });
});

describe("removeHotspot", () => {
  it("drops only the marker asked for", () => {
    const next = removeHotspot([info(), makeLink("kitchen")], "note-1");
    expect(next.map((h) => h.id)).toEqual(["to-kitchen"]);
  });
});

describe("doorLabel", () => {
  const scenes = [
    makeScene({ id: "living", name: "Living room" }),
    makeScene({ id: "bedroom", name: "Master bedroom" }),
  ];

  it("reads the target room's current name, not the one stored with the door", () => {
    // The door was placed when the room was still called "Bedroom".
    expect(doorLabel(scenes, makeLink("bedroom", { label: "Bedroom" }))).toBe(
      "Master bedroom"
    );
  });

  it("falls back to the stored label when the target is gone", () => {
    expect(doorLabel(scenes, makeLink("bathroom", { label: "Bathroom" }))).toBe(
      "Bathroom"
    );
  });
});

describe("describeYaw", () => {
  it("names the eight sectors, clockwise from ahead", () => {
    expect(describeYaw(0)).toBe("ahead");
    expect(describeYaw(deg(45))).toBe("halfRight");
    expect(describeYaw(deg(90))).toBe("right");
    expect(describeYaw(deg(180))).toBe("behind");
    expect(describeYaw(deg(-90))).toBe("left");
    expect(describeYaw(deg(-45))).toBe("halfLeft");
  });

  it("rounds to the nearest sector rather than truncating", () => {
    expect(describeYaw(deg(20))).toBe("ahead");
    expect(describeYaw(deg(30))).toBe("halfRight");
  });

  it("handles a yaw that has been turned round more than once", () => {
    expect(describeYaw(deg(360 + 90))).toBe("right");
  });
});

describe("countMarkers", () => {
  it("counts doors and notes across the whole tour", () => {
    const scenes = [
      makeScene({ id: "living", hotspots: [makeLink("bedroom"), info()] }),
      makeScene({ id: "bedroom", hotspots: [makeLink("living")] }),
    ];
    expect(countMarkers(scenes)).toEqual({ doors: 2, notes: 1 });
  });
});

describe("inboundDoors", () => {
  it("lists the rooms whose doors lead into each room", () => {
    const scenes = [
      makeScene({ id: "living", hotspots: [makeLink("bedroom")] }),
      makeScene({ id: "kitchen", hotspots: [makeLink("bedroom")] }),
      makeScene({ id: "bedroom", hotspots: [] }),
    ];
    const inbound = inboundDoors(scenes);
    expect(inbound.get("bedroom")).toEqual(["living", "kitchen"]);
    expect(inbound.get("living")).toEqual([]);
  });

  it("ignores a door pointing at a room that isn't in the tour", () => {
    const scenes = [makeScene({ id: "living", hotspots: [makeLink("gone")] })];
    expect([...inboundDoors(scenes).keys()]).toEqual(["living"]);
  });
});
