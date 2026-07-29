import { type Amenity, type Listing } from "@/schemas/listing";
import { type Review } from "@/schemas/review";

/* ============================================================
   Danapa presentation config.
   Every entity — listings, owners, reviews — is read from Supabase
   (see @/lib/services/*). What remains here is the cover-color
   palette, the amenity catalog, and pure display helpers with no
   data of their own. Domain schemas/types live in @/schemas/*.
   ============================================================ */

/* Cover-color palettes (solid blocks stand in for photos). */
export const PALETTE: string[][] = [
  ["oklch(0.74 0.07 150)", "oklch(0.68 0.06 150)", "oklch(0.8 0.05 145)"], // sage
  ["oklch(0.78 0.06 95)", "oklch(0.72 0.07 90)", "oklch(0.84 0.05 100)"], // moss/olive
  ["oklch(0.77 0.05 60)", "oklch(0.7 0.06 55)", "oklch(0.83 0.04 65)"], // sand/clay
  ["oklch(0.75 0.05 230)", "oklch(0.69 0.05 235)", "oklch(0.82 0.04 225)"], // slate blue
  ["oklch(0.76 0.06 25)", "oklch(0.7 0.07 28)", "oklch(0.83 0.05 30)"], // terracotta
  ["oklch(0.78 0.04 200)", "oklch(0.72 0.05 205)", "oklch(0.85 0.03 195)"], // stone teal
  ["oklch(0.8 0.05 130)", "oklch(0.74 0.06 135)", "oklch(0.86 0.04 125)"], // fern
  ["oklch(0.79 0.05 320)", "oklch(0.73 0.05 320)", "oklch(0.86 0.03 315)"], // muted plum
];

export const AMENITIES: Amenity[] = [
  { id: "wifi", label: "Fast Wi-Fi", icon: "wifi" },
  { id: "parking", label: "Parking", icon: "car" },
  { id: "pets", label: "Pet friendly", icon: "paw" },
  { id: "garden", label: "Garden / yard", icon: "leaf" },
  { id: "ac", label: "Air conditioning", icon: "snow" },
  { id: "laundry", label: "In-unit laundry", icon: "check-circle" },
];


/* ---- helpers ---- */
/* Prices are stored as a single USD amount. For Vietnamese, callers convert
   to VND at this fixed display rate (demo-only — not a live FX rate) and
   format with `useMoney()`. */
export const USD_TO_VND = 25000;

/* Availability as structured data so callers can localize it. Returns either
   "available now" or a concrete future date. */
export type AvailInfo = { kind: "now" } | { kind: "date"; date: Date };

/* `now` defaults to the current time, so most callers pass nothing. Static
   (prerendered) call sites must pass a time captured inside a cache boundary
   instead — reading the clock during a prerender isn't allowed under Cache
   Components (see the landing showcase fetchers in lib/services/listings). */
export const availInfo = (l: Listing, now: Date = new Date()): AvailInfo => {
  if (!l.available || l.available === "now") return { kind: "now" };
  const d = new Date(l.available + "T00:00:00");
  if (isNaN(d.getTime())) return { kind: "now" };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (d <= today) return { kind: "now" };
  return { kind: "date", date: d };
};

export const initialsOf = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const avgOf = (rs: Review[]) =>
  rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
