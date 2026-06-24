import { PALETTE } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";

/* Pure, server-side derivations for the landing showcase. No React. The seed
   data is the single source of truth; these mirror the curation the design
   applies (district counts, newest by id, trending by views). */

export type DistrictTile = {
  slug: string;
  name: string;
  count: number;
  from: number;
  color: string;
};

/** Active listings grouped by district, ranked by availability. */
export function getDistrictTiles(listings: Listing[]): DistrictTile[] {
  const byDist = new Map<string, DistrictTile>();
  for (const l of listings) {
    if (l.status !== "active") continue;
    const existing = byDist.get(l.district);
    if (existing) {
      existing.count++;
      existing.from = Math.min(existing.from, l.price);
    } else {
      byDist.set(l.district, {
        slug: l.district,
        name: districtLabel(l.district),
        count: 1,
        from: l.price,
        color: PALETTE[l.palette][0],
      });
    }
  }
  return [...byDist.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

const idNum = (id: string) => parseInt(id.replace(/\D/g, ""), 10) || 0;

/** Freshest active listings (highest id first). */
export function getNewest(listings: Listing[], limit = 4): Listing[] {
  return listings
    .filter((l) => l.status === "active")
    .sort((a, b) => idNum(b.id) - idNum(a.id))
    .slice(0, limit);
}

/** Most-watched active listings (highest views first). Pass `exclude` to keep
   the row disjoint from another (e.g. so a home shown as "newest" doesn't also
   appear under "trending"). */
export function getTrending(
  listings: Listing[],
  limit = 4,
  exclude: Set<string> = new Set()
): Listing[] {
  return listings
    .filter((l) => l.status === "active" && !exclude.has(l.id))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}
