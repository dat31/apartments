import { z } from "zod";

/* ============================================================
   Listing domain schemas + types.
   Reusable types are derived from the zod schemas (z.infer).
   Seed data and helpers live in @/lib/data/listings.
   ============================================================ */

export const TYPES = ["Studio", "Apartment", "Loft", "Townhouse", "House"] as const;

export const AmenitySchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
});
export type Amenity = z.infer<typeof AmenitySchema>;

export const ListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  price: z.number(),
  beds: z.number(),
  baths: z.number(),
  area: z.number(),
  district: z.string(),
  city: z.string(),
  palette: z.number(),
  amenities: z.array(z.string()),
  owner: z.string(),
  status: z.enum(["active", "draft"]),
  views: z.number(),
  available: z.string(),
  desc: z.string(),
  images: z.array(z.string()).optional(),
});
export type Listing = z.infer<typeof ListingSchema>;

/* The editable core of a listing — everything except the server-owned
   fields (id, owner, views, palette, status). Shared by the create/edit
   flows and the in-memory listings store. */
export type ListingCore = Pick<
  Listing,
  | "title"
  | "type"
  | "price"
  | "beds"
  | "baths"
  | "area"
  | "district"
  | "city"
  | "desc"
  | "amenities"
  | "images"
  | "available"
>;

/* Listing form schema — shared by the create and edit pages.
   Numeric fields are kept as strings while editing (native inputs/selects
   yield strings) and converted to numbers on submit via formToCore(). */
export const listingFormSchema = z.object({
  title: z.string().trim().min(1, "Give your listing a title."),
  type: z.string().min(1),
  price: z.string().refine((v) => Number(v) > 0, "Enter a price above 0."),
  beds: z.string(),
  baths: z.string(),
  area: z.string(),
  district: z.string().min(1, "Choose a district."),
  desc: z.string(),
  amenities: z.array(z.string()),
  images: z.array(z.string()),
  available: z.string(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const blankListingForm: ListingFormValues = {
  title: "",
  type: "Apartment",
  price: "",
  beds: "1",
  baths: "1",
  area: "",
  district: "",
  desc: "",
  amenities: [],
  images: [],
  available: "now",
};

/* Populate the form from an existing listing (edit mode). */
export function listingToForm(l: Listing): ListingFormValues {
  return {
    title: l.title,
    type: l.type,
    price: String(l.price),
    beds: String(l.beds),
    baths: String(l.baths),
    area: l.area ? String(l.area) : "",
    district: l.district,
    desc: l.desc,
    amenities: l.amenities ?? [],
    images: l.images ?? [],
    available: l.available || "now",
  };
}

/* Convert validated form values into the listing core the store stores. */
export function formToCore(v: ListingFormValues): ListingCore {
  return {
    title: v.title.trim(),
    type: v.type,
    price: Number(v.price),
    beds: Number(v.beds),
    baths: Number(v.baths),
    area: Number(v.area) || 40,
    district: v.district,
    city: "Da Nang",
    desc: v.desc,
    amenities: v.amenities,
    images: v.images,
    available: v.available,
  };
}
