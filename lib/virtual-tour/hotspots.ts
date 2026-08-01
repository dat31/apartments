import { clampPitch, wrapYaw } from "./math";
import { sceneById } from "./scene-graph";
import type { Hotspot, LinkHotspot, Scene } from "@/schemas/virtual-tour";

/* ============================================================
   Authoring a hotspot: the rules, without a renderer.

   Placement itself is `screenToYawPitch` in math.ts — this module is
   everything *around* it that the editor would otherwise hide inside a
   component: how far a nudge moves a marker, how a marker list reads a
   direction back to a host, and which name a door carries.

   Pure and React-free so the coverage gate can see it, and so the rules a
   renter's tour depends on aren't only exercised by clicking.
   ============================================================ */

/** One press of the nudge pad: 2.5°. Small enough to land a marker on a
    doorframe rather than the wall beside it, large enough that reaching the
    other side of the room isn't a hundred presses. */
export const NUDGE_STEP = (2.5 * Math.PI) / 180;

/** How far one arrow key turns the camera while aiming, in radians.
    Deliberately coarser than a nudge: this is looking around, not aiming. */
export const LOOK_STEP = (5 * Math.PI) / 180;

export type Direction = { yaw: number; pitch: number };

/** Snap a direction into what the schema and the camera will both accept.
    Every write goes through here, so a marker can never be authored somewhere
    the viewer is unable to look. */
export const normalizeDirection = (dir: Direction): Direction => ({
  yaw: wrapYaw(dir.yaw),
  pitch: clampPitch(dir.pitch),
});

/** Move a marker by a delta — the nudge pad, and the arrow keys. */
export const nudgeHotspot = <T extends Hotspot>(
  hotspot: T,
  dYaw: number,
  dPitch: number
): T => ({
  ...hotspot,
  ...normalizeDirection({
    yaw: hotspot.yaw + dYaw,
    pitch: hotspot.pitch + dPitch,
  }),
});

/** Put a marker somewhere else entirely — the drag, and "move it". */
export const moveHotspot = <T extends Hotspot>(hotspot: T, dir: Direction): T => ({
  ...hotspot,
  ...normalizeDirection(dir),
});

/** Add or replace, keeping the list's order stable so a marker doesn't jump
    around its own list while it is being edited. */
export function upsertHotspot(hotspots: Hotspot[], hotspot: Hotspot): Hotspot[] {
  const index = hotspots.findIndex((h) => h.id === hotspot.id);
  if (index === -1) return [...hotspots, hotspot];
  const next = [...hotspots];
  next[index] = hotspot;
  return next;
}

export const removeHotspot = (hotspots: Hotspot[], id: string): Hotspot[] =>
  hotspots.filter((h) => h.id !== id);

export const isDoorTo = (hotspot: Hotspot, sceneId: string): boolean =>
  hotspot.kind === "link" && hotspot.target === sceneId;

/** What a door is called, resolved at render time rather than at write time.

    A door's stored `label` is the target room's name as it was when the door
    was placed. Rename "Bedroom" to "Master bedroom" and three doors in other
    rooms would still say the old name — so the target scene is the truth, and
    the stored label is only the fallback for a target that is gone (which the
    publish gate blocks anyway). Rewriting every sibling on rename would be a
    second write path that can half-fail. */
export function doorLabel(scenes: Scene[], hotspot: LinkHotspot): string {
  return sceneById(scenes, hotspot.target)?.name ?? hotspot.label;
}

/** Eight compass sectors, as translation keys — "behind you" has to be
    sayable in Vietnamese too. Index 0 is straight ahead and they run
    clockwise, matching yaw's rightward-positive convention. */
export const DIRECTION_KEYS = [
  "ahead",
  "halfRight",
  "right",
  "behindRight",
  "behind",
  "behindLeft",
  "left",
  "halfLeft",
] as const;
export type DirectionKey = (typeof DIRECTION_KEYS)[number];

/** A yaw as a direction a host can read back — how the marker list says where
    a marker is without making them go and look. */
export function describeYaw(yaw: number): DirectionKey {
  const turns = wrapYaw(yaw) / (Math.PI * 2);
  const sector = Math.round(((turns % 1) + 1) * 8) % 8;
  return DIRECTION_KEYS[sector];
}

/** Markers across the whole tour, for the editor's one-line summary. */
export function countMarkers(scenes: Scene[]): { doors: number; notes: number } {
  let doors = 0;
  let notes = 0;
  for (const scene of scenes) {
    for (const hotspot of scene.hotspots) {
      if (hotspot.kind === "link") doors += 1;
      else notes += 1;
    }
  }
  return { doors, notes };
}

/** Scene id → the rooms whose doors lead into it. "No door leads here yet" is
    advisory (the room rail reaches every room), but a host still wants to see
    it without opening all six rooms to find out. */
export function inboundDoors(scenes: Scene[]): Map<string, string[]> {
  const inbound = new Map<string, string[]>(scenes.map((s) => [s.id, []]));
  for (const scene of scenes) {
    for (const hotspot of scene.hotspots) {
      if (hotspot.kind !== "link") continue;
      inbound.get(hotspot.target)?.push(scene.id);
    }
  }
  return inbound;
}
