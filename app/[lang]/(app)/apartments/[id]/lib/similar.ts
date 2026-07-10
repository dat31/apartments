import { type Listing } from "@/schemas/listing";

export type SimilarResult = { picks: Listing[]; districtScoped: boolean };

/* Rank other active listings by likeness to the one being viewed and return
   the best `n`. Same-district matches are strongly preferred; when at least
   `n` of them exist the caller scopes the heading to that district, otherwise
   it falls back to the city. Pure (no React, no I/O) so it runs server-side as
   a cheap in-memory scan over the already-cached listings pool.

   Scoring: strong bonuses for the same district / type, with continuous
   penalties as price, bed count, and area drift from the current home. */
export function rankSimilar(
  listings: Listing[],
  current: Listing,
  n = 3
): SimilarResult {
  const pool = (listings ?? []).filter(
    (l) => l.id !== current.id && l.status === "active"
  );
  const score = (l: Listing) => {
    let s = 0;
    if (l.district === current.district) s += 100;
    if (l.city === current.city) s += 20;
    if (l.type === current.type) s += 30;
    s -= Math.min(35, Math.abs(l.price - current.price) / 100); // price proximity
    s -= Math.abs((l.beds || 0) - (current.beds || 0)) * 6; // bedroom proximity
    s -= Math.min(15, Math.abs((l.area || 0) - (current.area || 0)) / 12); // area proximity
    return s;
  };
  const picks = [...pool].sort((a, b) => score(b) - score(a)).slice(0, n);
  const sameDistrict = pool.filter(
    (l) => l.district === current.district
  ).length;
  return { picks, districtScoped: sameDistrict >= n };
}
