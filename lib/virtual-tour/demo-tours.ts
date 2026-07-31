import { uvToYawPitch } from "./math";
import { isLink } from "./scene-graph";
import type { Hotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";

/* ============================================================
   Demo tour content — the MVP's stand-in for the database.

   The plan (docs/plans/virtual-home-tour.md §4) puts tours in
   `listing_virtual_tours` / `virtual_tour_scenes`, authored by owners in
   phase 3. Until that migration lands, a tour is *derived* from the
   listing: every listing that qualifies gets a tour built from the five
   CC0 demo panoramas in public/panoramas (see CREDITS.txt there).

   Everything here is pure and deterministic — same listing, same tour,
   on the server and in the browser. When the real tables arrive, this
   module is deleted and lib/services/virtual-tours.ts reads rows
   instead; nothing above it changes, because both produce a VirtualTour.

   Hotspots are authored in *panorama coordinates* (u across, v down,
   both 0..1) because that is how a human reads a flat 360 photo, and
   converted to yaw/pitch once, here.
   ============================================================ */

type SceneSeed = {
  id: string;
  room: Scene["room"];
  /** Where the camera looks when the room opens, as a u coordinate. */
  entryU: number;
  hotspots: Array<
    | {
        kind: "link";
        to: string;
        u: number;
        v: number;
        /* Where this door leads when `to` isn't part of the tour. A studio
           has no bedroom, so the living room's second archway has to open
           onto the bathroom instead — otherwise the bathroom, whose only
           other door was the bedroom's, is left stranded. */
        fallbackTo?: string;
      }
    | { kind: "info"; id: string; u: number; v: number }
  >;
};

/* Room names and info-hotspot copy are *content*, not UI strings — an owner
   would write them per listing, so they are not translated (plan §10). The
   demo speaks English, like the rest of the seeded listing content. */
const SCENE_NAMES: Record<string, string> = {
  living: "Living room",
  kitchen: "Kitchen & dining",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  balcony: "Balcony",
};

const INFO_COPY: Record<string, { label: string; body: string }> = {
  "living-area": {
    label: "Living area",
    body: "About 22 m² of furnished living space, with the balcony doors on the far side.",
  },
  "kitchen-fittings": {
    label: "Fitted kitchen",
    body: "Comes with the fridge, gas hob and cabinetry you can see — nothing to buy on move-in.",
  },
  "bedroom-aircon": {
    label: "Air conditioning",
    body: "Split-unit air conditioning over the bed, plus a ceiling fan in the living room.",
  },
  "bathroom-fittings": {
    label: "Bath & shower",
    body: "Full-size bath with an overhead shower, and a window that actually opens.",
  },
  "balcony-view": {
    label: "The view",
    body: "East-facing balcony — morning sun, and the sea visible past the rooftops.",
  },
};

/* The demo apartment, as a graph of rooms. Coordinates were read off the
   panoramas themselves: a door at u 0.36 in the living-room shot is the arch
   into the kitchen. v sits just below the horizon (0.5) so markers land on
   the doorway rather than floating at eye level in the middle of the room. */
const SCENE_SEEDS: SceneSeed[] = [
  {
    id: "living",
    room: "living",
    entryU: 0.55,
    hotspots: [
      { kind: "link", to: "kitchen", u: 0.36, v: 0.55 },
      { kind: "link", to: "balcony", u: 0.63, v: 0.53 },
      { kind: "link", to: "bedroom", u: 0.87, v: 0.55, fallbackTo: "bathroom" },
      { kind: "info", id: "living-area", u: 0.5, v: 0.62 },
    ],
  },
  {
    id: "kitchen",
    room: "kitchen",
    entryU: 0.45,
    hotspots: [
      { kind: "link", to: "living", u: 0.19, v: 0.55 },
      { kind: "link", to: "balcony", u: 0.41, v: 0.52 },
      { kind: "info", id: "kitchen-fittings", u: 0.86, v: 0.5 },
    ],
  },
  {
    id: "bedroom",
    room: "bed",
    entryU: 0.78,
    hotspots: [
      { kind: "link", to: "bathroom", u: 0.12, v: 0.55 },
      { kind: "link", to: "balcony", u: 0.6, v: 0.52 },
      { kind: "link", to: "living", u: 0.32, v: 0.55 },
      { kind: "info", id: "bedroom-aircon", u: 0.9, v: 0.36 },
    ],
  },
  {
    id: "bathroom",
    room: "bath",
    entryU: 0.22,
    hotspots: [
      { kind: "link", to: "bedroom", u: 0.7, v: 0.5 },
      { kind: "info", id: "bathroom-fittings", u: 0.47, v: 0.62 },
    ],
  },
  {
    id: "balcony",
    room: "balcony",
    entryU: 0.47,
    hotspots: [
      { kind: "link", to: "living", u: 0.05, v: 0.55 },
      { kind: "link", to: "kitchen", u: 0.93, v: 0.55 },
      { kind: "info", id: "balcony-view", u: 0.47, v: 0.45 },
    ],
  },
];

/** Panorama file names, by scene id. Both sizes live in public/panoramas. */
const PANORAMA_FILE: Record<string, string> = {
  living: "living-room",
  kitchen: "kitchen",
  bedroom: "bedroom",
  bathroom: "bathroom",
  balcony: "balcony",
};

/** Rooms a studio has. Anything with a separate bedroom gets all five. */
const STUDIO_SCENES = ["living", "kitchen", "bathroom", "balcony"];

/* A tiny, stable string hash (FNV-1a). Only used to decide *which* demo
   listings have a tour, so the browse grid shows both states — a real
   deployment reads listings.has_virtual_tour instead (plan §4.2). */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Does this listing have a (demo) published tour? Two listings in three,
    deterministically — so the "360°" badge means something on the browse
    grid and the no-tour path stays reachable. */
export const hasDemoTour = (listingId: string): boolean =>
  hashId(listingId) % 3 !== 0;

/** Build one scene from its seed, keeping only the links whose target is
    part of this tour. Pruning here rather than at render time is what makes
    a smaller tour (a studio) still validate: no dangling doors. */
function buildScene(seed: SceneSeed, included: Set<string>, order: number): Scene {
  const hotspots: Hotspot[] = seed.hotspots.flatMap((spot): Hotspot[] => {
    if (spot.kind === "link") {
      const target = included.has(spot.to)
        ? spot.to
        : spot.fallbackTo && included.has(spot.fallbackTo)
          ? spot.fallbackTo
          : null;
      if (target === null) return [];
      const { yaw, pitch } = uvToYawPitch(spot.u, spot.v);
      return [
        {
          id: `${seed.id}-to-${target}`,
          kind: "link" as const,
          yaw,
          pitch,
          label: SCENE_NAMES[target],
          target,
        },
      ];
    }
    const { yaw, pitch } = uvToYawPitch(spot.u, spot.v);
    const copy = INFO_COPY[spot.id];
    return [
      {
        id: spot.id,
        kind: "info" as const,
        yaw,
        pitch,
        label: copy.label,
        body: copy.body,
      },
    ];
  });

  const file = PANORAMA_FILE[seed.id];
  return {
    id: seed.id,
    name: SCENE_NAMES[seed.id],
    room: seed.room,
    panorama: `/panoramas/${file}.jpg`,
    preview: `/panoramas/${file}-preview.jpg`,
    yaw: uvToYawPitch(seed.entryU, 0.5).yaw,
    pitch: 0,
    sortOrder: order,
    hotspots,
  };
}

/** The demo tour for a listing, or null when this listing is one of the
    thirds without one. `beds` shapes the tour: a studio has no bedroom
    scene, so the doors that led there are pruned with it. */
export function demoTourFor(
  listing: { id: string; beds: number },
  { force = false }: { force?: boolean } = {}
): VirtualTour | null {
  if (!force && !hasDemoTour(listing.id)) return null;

  const included = new Set(
    listing.beds === 0 ? STUDIO_SCENES : SCENE_SEEDS.map((s) => s.id)
  );
  const scenes = SCENE_SEEDS.filter((seed) => included.has(seed.id)).map(
    (seed, index) => buildScene(seed, included, index)
  );

  return {
    id: `demo-tour-${listing.id}`,
    listingId: listing.id,
    status: "published",
    entryScene: scenes[0].id,
    scenes,
  };
}

/** Rooms a tour opens onto, in rail order, for surfaces that want to name
    them without mounting a viewer (metadata, the entry pill's tooltip). */
export const sceneNames = (tour: VirtualTour): string[] =>
  tour.scenes.map((s) => s.name);

/** How many doors the tour has, for the same surfaces. Counts link hotspots
    across every scene — the number of ways a renter can walk. */
export const doorCount = (tour: VirtualTour): number =>
  tour.scenes.reduce((n, s) => n + s.hotspots.filter(isLink).length, 0);
