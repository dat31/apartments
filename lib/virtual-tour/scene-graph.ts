import type { Hotspot, LinkHotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";

/* ============================================================
   The tour as a graph: scenes are nodes, link hotspots are edges.

   Pure and React-free — the viewer uses it to decide what to preload
   next, the room rail to cycle rooms, and (phase 3) the owner editor to
   refuse to publish a tour a renter could get stuck in.
   ============================================================ */

export const isLink = (h: Hotspot): h is LinkHotspot => h.kind === "link";

/** Scenes in the order the rail shows them: sortOrder, then id as a
    tiebreak so the order can't wobble between renders. */
export const orderedScenes = (scenes: Scene[]): Scene[] =>
  [...scenes].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

export const sceneById = (scenes: Scene[], id: string): Scene | undefined =>
  scenes.find((s) => s.id === id);

/** scene id → the scenes its link hotspots walk to. Targets that don't exist
    are dropped here, so callers never have to guard: a dangling link is an
    authoring problem (validateTourGraph reports it), not a runtime one. */
export function adjacency(scenes: Scene[]): Map<string, string[]> {
  const ids = new Set(scenes.map((s) => s.id));
  return new Map(
    scenes.map((scene) => [
      scene.id,
      scene.hotspots
        .filter(isLink)
        .map((h) => h.target)
        .filter((target) => target !== scene.id && ids.has(target)),
    ])
  );
}

/** Which panoramas to fetch next, best first: the rooms one door away (in
    rail order), then everything else. The viewer walks this list on idle, so
    the room the renter is most likely to open next is already decoded. The
    current scene is never in the result. */
export function preloadOrder(scenes: Scene[], currentId: string): string[] {
  const neighbours = new Set(adjacency(scenes).get(currentId) ?? []);
  const rest = orderedScenes(scenes).filter(
    (s) => s.id !== currentId && !neighbours.has(s.id)
  );
  return [
    ...orderedScenes(scenes)
      .filter((s) => neighbours.has(s.id))
      .map((s) => s.id),
    ...rest.map((s) => s.id),
  ];
}

/** The scene `step` places along the rail from `currentId`, wrapping around.
    Drives the ←/→ keyboard shortcuts and the rail's prev/next controls. */
export function stepScene(
  scenes: Scene[],
  currentId: string,
  step: number
): Scene | undefined {
  const ordered = orderedScenes(scenes);
  if (ordered.length === 0) return undefined;
  const index = ordered.findIndex((s) => s.id === currentId);
  if (index === -1) return ordered[0];
  const next = (index + step) % ordered.length;
  return ordered[next < 0 ? next + ordered.length : next];
}

export type TourIssue =
  | { code: "no-scenes" }
  | { code: "entry-missing"; sceneId: string }
  | { code: "dangling-link"; sceneId: string; hotspotId: string; target: string }
  | { code: "self-link"; sceneId: string; hotspotId: string }
  | { code: "duplicate-scene"; sceneId: string }
  | { code: "unreachable-scene"; sceneId: string };

/** Everything wrong with a tour, as data. Phase 3 blocks publishing until
    this is empty; today it is what the seed data is tested against, and the
    viewer's guarantee that a rendered tour is walkable end to end.

    "Unreachable" is deliberately checked over the *undirected* graph: a
    renter can always walk back the way they came using the room rail, so a
    one-way door is not a trap — a room with no door at all is. */
export function validateTourGraph(tour: VirtualTour): TourIssue[] {
  const issues: TourIssue[] = [];
  const { scenes, entryScene } = tour;

  if (scenes.length === 0) return [{ code: "no-scenes" }];

  const seen = new Set<string>();
  for (const scene of scenes) {
    if (seen.has(scene.id)) issues.push({ code: "duplicate-scene", sceneId: scene.id });
    seen.add(scene.id);
  }

  if (!seen.has(entryScene)) issues.push({ code: "entry-missing", sceneId: entryScene });

  for (const scene of scenes) {
    for (const hotspot of scene.hotspots.filter(isLink)) {
      if (hotspot.target === scene.id) {
        issues.push({ code: "self-link", sceneId: scene.id, hotspotId: hotspot.id });
      } else if (!seen.has(hotspot.target)) {
        issues.push({
          code: "dangling-link",
          sceneId: scene.id,
          hotspotId: hotspot.id,
          target: hotspot.target,
        });
      }
    }
  }

  // Flood-fill from the entry scene across doors in either direction.
  const links = adjacency(scenes);
  const undirected = new Map<string, Set<string>>(
    scenes.map((s) => [s.id, new Set<string>()])
  );
  for (const [from, targets] of links) {
    for (const to of targets) {
      undirected.get(from)?.add(to);
      undirected.get(to)?.add(from);
    }
  }

  const reached = new Set<string>();
  const queue = seen.has(entryScene) ? [entryScene] : [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const next of undirected.get(id) ?? []) queue.push(next);
  }

  for (const scene of scenes) {
    if (!reached.has(scene.id)) {
      issues.push({ code: "unreachable-scene", sceneId: scene.id });
    }
  }

  return issues;
}
