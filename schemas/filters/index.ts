import { z } from "zod";

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
};

export type SortKey = "featured" | "low" | "high" | "area";
