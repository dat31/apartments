import { z } from "zod";
import { type Listing } from "@/lib/data/listings";
import { type ListingCore } from "@/hooks/use-listings";

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
  neighborhood: z.string().min(1, "Choose a district."),
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
  neighborhood: "",
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
    neighborhood: l.neighborhood,
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
    neighborhood: v.neighborhood,
    city: "Da Nang",
    desc: v.desc,
    amenities: v.amenities,
    images: v.images,
    available: v.available,
  };
}
