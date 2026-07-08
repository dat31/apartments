import { District, type Listing } from "@/schemas/listing";

/* ============================================================
   Approximate listing coordinates.
   Listings only store a district (no address / lat-lng column),
   and the detail map deliberately shows an *approximate* location
   with a privacy circle — the exact address is shared after a
   tour is confirmed. So we anchor each listing to its district's
   residential center and add a small deterministic per-listing
   offset so same-district homes don't stack on one point.
   Pure module — no React, safe on server and client.
   ============================================================ */

export type LatLng = [number, number];

/* Residential centers of Da Nang's urban districts. */
const DISTRICT_CENTERS: Record<District, LatLng> = {
  [District.LienChieu]: [16.076, 108.15],
  [District.ThanhKhe]: [16.064, 108.187],
  [District.HaiChau]: [16.047, 108.22],
  [District.SonTra]: [16.067, 108.2415],
  [District.NguHanhSon]: [16.029, 108.245],
  [District.CamLe]: [16.013, 108.205],
};

/* djb2 — cheap deterministic string hash. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/* Map a hash to [-1, 1]. */
const spread = (h: number) => (h % 2000) / 1000 - 1;

/** Approximate coordinates for a listing: district center plus a
    deterministic ~±650 m offset derived from the listing id. */
export function listingCoords(l: Pick<Listing, "id" | "district">): LatLng {
  const [lat, lng] = DISTRICT_CENTERS[l.district] ?? DISTRICT_CENTERS[District.HaiChau];
  return [
    lat + spread(hash(l.id)) * 0.006,
    lng + spread(hash(l.id + "|lng")) * 0.006,
  ];
}

/** Great-circle distance (km) between two points. */
export function kmBetween(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
