import { districtLabel, type Listing } from "@/schemas/listing";

/* Pure, server-side derivations for the landing showcase. No React. Fed the
   live active listings from Supabase; these mirror the curation the design
   applies (district counts, newest first, trending by views). */

export type DistrictTile = {
  slug: string;
  name: string;
  count: number;
  from: number;
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
      });
    }
  }
  return [...byDist.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

/** Freshest active listings, newest-first. Expects `listings` in creation
    order (oldest-first, as getActiveListings returns) — the tail is newest, so
    we take the last `limit` and reverse. Works with real uuid ids, which carry
    no orderable number of their own. */
export function getNewest(listings: Listing[], limit = 4): Listing[] {
  const active = listings.filter((l) => l.status === "active");
  return active.slice(-limit).reverse();
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
