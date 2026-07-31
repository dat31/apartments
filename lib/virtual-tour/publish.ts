import type { TourIssue } from "./scene-graph";

/* ============================================================
   What stops an owner publishing, and what is only worth mentioning.

   validateTourGraph reports facts; deciding which of them are fatal is a
   product judgement, so it lives here rather than in the validator.

   The judgement that matters: **an unreachable room does not block.** With
   no doors placed yet the flood-fill reaches only the entry scene, so a
   perfectly good rooms-only tour reports every other room as unreachable —
   and it *is* walkable, because the room rail reaches every room by design
   (that is also why validateTourGraph tolerates one-way links). Treating it
   as fatal would make the first tour anyone builds unpublishable.

   Everything else describes a tour that would misbehave for a renter: no
   rooms at all, an entry that isn't there, duplicate ids, or a door that
   leads nowhere.
   ============================================================ */

const BLOCKING: ReadonlySet<TourIssue["code"]> = new Set([
  "no-scenes",
  "entry-missing",
  "duplicate-scene",
  "dangling-link",
  "self-link",
]);

export const isBlocking = (issue: TourIssue): boolean => BLOCKING.has(issue.code);

/** Split what the validator found into "fix this before publishing" and
    "you may want to know". Order is preserved within each list. */
export function partitionIssues(issues: TourIssue[]): {
  blocking: TourIssue[];
  advisory: TourIssue[];
} {
  const blocking: TourIssue[] = [];
  const advisory: TourIssue[] = [];
  for (const issue of issues) (isBlocking(issue) ? blocking : advisory).push(issue);
  return { blocking, advisory };
}

/** Can this tour go live? */
export const canPublish = (issues: TourIssue[]): boolean =>
  !issues.some(isBlocking);
