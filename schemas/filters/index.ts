import { z } from "zod";

/* Availability horizons — cumulative move-in windows ("within 2 weeks"
   includes listings available now). Values are the `avail` URL param. */
export const AVAIL_KEYS = ["any", "now", "1w", "2w", "1m"] as const;
export type AvailKey = (typeof AVAIL_KEYS)[number];

export const AVAIL_MAX_DAYS: Record<Exclude<AvailKey, "any">, number> = {
  now: 0,
  "1w": 7,
  "2w": 14,
  "1m": 31,
};

/** Latest acceptable `available` date (local YYYY-MM-DD) for a horizon.
    Shared by the in-memory predicate and the Supabase query so both sides
    filter on the same boundary. */
export function availCutoffISO(avail: Exclude<AvailKey, "any">): string {
  const d = new Date();
  d.setDate(d.getDate() + AVAIL_MAX_DAYS[avail]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Minimum-area thresholds (m²). "" = any size. */
export const MIN_AREA_OPTIONS = ["", "20", "30", "40", "50"] as const;

export const filtersSchema = z.object({
  q: z.string(),
  type: z.string(),
  district: z.string(),
  minPrice: z.string(),
  maxPrice: z.string(),
  beds: z.string(),
  amenities: z.array(z.string()),
  // Owner key ("you"/"maya"/…) or profile uuid; "All" means no owner filter.
  // Set only by the "See all homes" link on a host profile, cleared from the
  // browse banner — there is no owner control in the filters panel.
  owner: z.string(),
  avail: z.enum(AVAIL_KEYS),
  // Minimum area in m² as a string ("" = no minimum), like minPrice/maxPrice.
  minArea: z.string(),
});
export type Filters = z.infer<typeof filtersSchema>;

export const DEFAULT_FILTERS: Filters = {
  q: "",
  type: "All",
  district: "All",
  minPrice: "",
  maxPrice: "",
  beds: "Any",
  amenities: [],
  owner: "All",
  avail: "any",
  minArea: "",
};

export type SortKey = "featured" | "newest" | "low" | "high" | "area";
