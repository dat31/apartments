import { z } from "zod";

export const filtersSchema = z.object({
  q: z.string(),
  type: z.string(),
  district: z.string(),
  minPrice: z.string(),
  maxPrice: z.string(),
  beds: z.string(),
  amenities: z.array(z.string()),
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
};

export type SortKey = "featured" | "low" | "high" | "area";
