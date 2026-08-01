import { describe, expect, it } from "vitest";
import {
  HotspotSchema,
  ROOM_KINDS,
  SceneSchema,
  VirtualTourSchema,
} from "@/schemas/virtual-tour";
import { makeLink, makeScene, makeVirtualTour } from "@/tests/factories";

describe("HotspotSchema", () => {
  const link = makeLink("bedroom");
  const info = {
    id: "balcony-view",
    kind: "info" as const,
    yaw: 0.4,
    pitch: -0.1,
    label: "The view",
    body: "East-facing, sea past the rooftops.",
  };

  it("accepts a door and a point of interest", () => {
    expect(HotspotSchema.safeParse(link).success).toBe(true);
    expect(HotspotSchema.safeParse(info).success).toBe(true);
  });

  /** A copy of `hotspot` with one field missing, as a partial row would be. */
  const without = (hotspot: object, field: string) => {
    const copy: Record<string, unknown> = { ...hotspot };
    delete copy[field];
    return copy;
  };

  it("rejects a door with nowhere to go", () => {
    expect(HotspotSchema.safeParse(without(link, "target")).success).toBe(false);
    expect(HotspotSchema.safeParse({ ...link, target: "" }).success).toBe(false);
  });

  it("rejects a point of interest with nothing to say", () => {
    expect(HotspotSchema.safeParse(without(info, "body")).success).toBe(false);
  });

  it("rejects an unknown hotspot kind rather than rendering a blank marker", () => {
    expect(HotspotSchema.safeParse({ ...link, kind: "video" }).success).toBe(false);
  });

  it("rejects a pitch past the pole, which the camera can never look at", () => {
    expect(HotspotSchema.safeParse({ ...link, pitch: Math.PI }).success).toBe(false);
  });

  it("keeps an optional close-up photo on a point of interest", () => {
    const parsed = HotspotSchema.parse({ ...info, photo: "/panoramas/x.jpg" });
    expect(parsed).toMatchObject({ photo: "/panoramas/x.jpg" });
  });
});

describe("SceneSchema", () => {
  it("accepts a scene from the factory", () => {
    expect(SceneSchema.safeParse(makeScene()).success).toBe(true);
  });

  it("defaults the optional camera and ordering fields", () => {
    const parsed = SceneSchema.parse({
      id: "living",
      name: "Living room",
      panorama: "/panoramas/living-room.jpg",
      preview: "/panoramas/living-room-preview.jpg",
    });
    expect(parsed).toMatchObject({
      room: "other",
      yaw: 0,
      pitch: 0,
      sortOrder: 0,
      hotspots: [],
    });
  });

  it("requires both panorama sizes — the preview is the first paint", () => {
    expect(SceneSchema.safeParse(makeScene({ preview: "" })).success).toBe(false);
    expect(SceneSchema.safeParse(makeScene({ panorama: "" })).success).toBe(false);
  });

  it("rejects a room kind outside the catalog", () => {
    expect(SceneSchema.safeParse({ ...makeScene(), room: "garage" }).success).toBe(false);
    expect(ROOM_KINDS).toContain("balcony");
  });

  it("rejects a fractional sort order", () => {
    expect(SceneSchema.safeParse(makeScene({ sortOrder: 1.5 })).success).toBe(false);
  });
});

describe("VirtualTourSchema", () => {
  it("accepts a two-room tour", () => {
    expect(VirtualTourSchema.safeParse(makeVirtualTour()).success).toBe(true);
  });

  it("rejects a tour with no rooms", () => {
    expect(VirtualTourSchema.safeParse(makeVirtualTour({ scenes: [] })).success).toBe(false);
  });

  it("rejects a status the RLS policies don't know about", () => {
    const tour = { ...makeVirtualTour(), status: "archived" };
    expect(VirtualTourSchema.safeParse(tour).success).toBe(false);
  });

  it("requires an entry scene", () => {
    expect(
      VirtualTourSchema.safeParse(makeVirtualTour({ entryScene: "" })).success
    ).toBe(false);
  });
});
