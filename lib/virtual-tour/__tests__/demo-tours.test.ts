import { describe, expect, it } from "vitest";
import {
  demoTourFor,
  doorCount,
  hasDemoTour,
  hashId,
  sceneNames,
} from "@/lib/virtual-tour/demo-tours";
import { validateTourGraph } from "@/lib/virtual-tour/scene-graph";
import { yawPitchToUv } from "@/lib/virtual-tour/math";
import { VirtualTourSchema } from "@/schemas/virtual-tour";
import { makeListing } from "@/tests/factories";

/* The demo tour is derived from the listing, so these specs are what stands
   in for the DB constraints the real tables will have. */

const withTour = (beds = 2) => {
  // hasDemoTour is a hash, so find an id that has one rather than assuming.
  for (let i = 0; i < 100; i++) {
    const listing = makeListing({ beds });
    if (hasDemoTour(listing.id)) return listing;
  }
  throw new Error("no listing id with a demo tour — hashId is broken");
};

describe("hashId", () => {
  it("is stable for the same id", () => {
    expect(hashId("abc")).toBe(hashId("abc"));
  });

  it("separates different ids", () => {
    expect(hashId("abc")).not.toBe(hashId("abd"));
  });

  it("stays a non-negative 32-bit integer", () => {
    for (const id of ["", "a", "00000000-0000-4000-8000-000000000001"]) {
      const hash = hashId(id);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("hasDemoTour", () => {
  it("gives roughly two listings in three a tour", () => {
    const ids = Array.from({ length: 300 }, (_, i) => `listing-${i}`);
    const share = ids.filter(hasDemoTour).length / ids.length;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.85);
  });

  it("leaves some listings without one, so the no-tour path stays reachable", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `listing-${i}`);
    expect(ids.some((id) => !hasDemoTour(id))).toBe(true);
  });
});

describe("demoTourFor", () => {
  it("returns null for a listing without a tour", () => {
    const id = Array.from({ length: 100 }, (_, i) => `listing-${i}`).find(
      (candidate) => !hasDemoTour(candidate)
    ) as string;
    expect(demoTourFor({ id, beds: 2 })).toBeNull();
  });

  it("builds one anyway when forced — the shared demo tour for any listing", () => {
    const id = Array.from({ length: 100 }, (_, i) => `listing-${i}`).find(
      (candidate) => !hasDemoTour(candidate)
    ) as string;
    expect(demoTourFor({ id, beds: 2 }, { force: true })?.listingId).toBe(id);
  });

  it("produces a tour that parses against the schema", () => {
    const listing = withTour();
    expect(VirtualTourSchema.safeParse(demoTourFor(listing)).success).toBe(true);
  });

  it("produces a walkable graph — no dangling doors, no stranded rooms", () => {
    const listing = withTour();
    expect(validateTourGraph(demoTourFor(listing) as never)).toEqual([]);
  });

  it("opens on the living room", () => {
    const tour = demoTourFor(withTour());
    expect(tour?.entryScene).toBe("living");
    expect(tour?.scenes[0].id).toBe("living");
  });

  it("gives a studio no bedroom, and prunes the doors that led there", () => {
    const tour = demoTourFor(withTour(0)) as NonNullable<ReturnType<typeof demoTourFor>>;
    expect(sceneNames(tour)).not.toContain("Bedroom");
    expect(validateTourGraph(tour)).toEqual([]);
    expect(doorCount(tour)).toBeGreaterThan(0);
  });

  it("re-points the living room's second archway at the bathroom in a studio", () => {
    // Without the fallback the bathroom's only door was the bedroom's, and
    // dropping the bedroom stranded it.
    const tour = demoTourFor(withTour(0)) as NonNullable<ReturnType<typeof demoTourFor>>;
    const living = tour.scenes.find((s) => s.id === "living");
    expect(living?.hotspots.map((h) => h.id)).toContain("living-to-bathroom");
    // The bathroom's own door led to the bedroom, so it is pruned entirely.
    const bathroom = tour.scenes.find((s) => s.id === "bathroom");
    expect(bathroom?.hotspots.filter((h) => h.kind === "link")).toEqual([]);
  });

  it("gives a one-bed listing every room", () => {
    const tour = demoTourFor(withTour(1)) as NonNullable<ReturnType<typeof demoTourFor>>;
    expect(sceneNames(tour)).toEqual([
      "Living room",
      "Kitchen & dining",
      "Bedroom",
      "Bathroom",
      "Balcony",
    ]);
  });

  it("is deterministic — the same listing always gets the same tour", () => {
    const listing = withTour();
    expect(demoTourFor(listing)).toEqual(demoTourFor(listing));
  });

  it("points every scene at a panorama and its preview", () => {
    for (const scene of (demoTourFor(withTour()) as NonNullable<
      ReturnType<typeof demoTourFor>
    >).scenes) {
      expect(scene.panorama).toMatch(/^\/panoramas\/[a-z-]+\.jpg$/);
      expect(scene.preview).toBe(scene.panorama.replace(".jpg", "-preview.jpg"));
    }
  });

  it("keeps every hotspot inside the panorama it is painted on", () => {
    for (const scene of (demoTourFor(withTour()) as NonNullable<
      ReturnType<typeof demoTourFor>
    >).scenes) {
      for (const hotspot of scene.hotspots) {
        const { u, v } = yawPitchToUv(hotspot.yaw, hotspot.pitch);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
        // Markers sit near the horizon, never up in the ceiling or on the
        // floor directly underfoot, where an equirectangular photo smears.
        expect(v).toBeGreaterThan(0.2);
        expect(v).toBeLessThan(0.8);
      }
    }
  });

  it("gives every hotspot a unique id within its scene", () => {
    for (const scene of (demoTourFor(withTour()) as NonNullable<
      ReturnType<typeof demoTourFor>
    >).scenes) {
      const ids = scene.hotspots.map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("doorCount / sceneNames", () => {
  it("counts the link hotspots and ignores the info ones", () => {
    const tour = demoTourFor(withTour(1)) as NonNullable<ReturnType<typeof demoTourFor>>;
    const infos = tour.scenes.flatMap((s) => s.hotspots).filter((h) => h.kind === "info");
    const all = tour.scenes.flatMap((s) => s.hotspots).length;
    expect(doorCount(tour)).toBe(all - infos.length);
    expect(sceneNames(tour)).toHaveLength(tour.scenes.length);
  });
});
