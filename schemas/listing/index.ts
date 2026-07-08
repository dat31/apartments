import { z } from "zod";

/* ============================================================
   Listing domain schemas + types.
   Reusable types are derived from the zod schemas (z.infer).
   Seed data and helpers live in @/lib/data/listings.
   ============================================================ */

export const TYPES = ["Studio", "Apartment", "Loft", "Townhouse", "House"] as const;

/* Da Nang urban districts. Enum values match the Postgres `district` enum
   (slugs); DISTRICT_LABELS holds the human-readable name shown in the UI. */
export enum District {
  LienChieu = "lien-chieu",
  HaiChau = "hai-chau",
  CamLe = "cam-le",
  NguHanhSon = "ngu-hanh-son",
  ThanhKhe = "thanh-khe",
  SonTra = "son-tra",
}

export const DISTRICT_LABELS: Record<District, string> = {
  [District.LienChieu]: "Liên Chiểu",
  [District.HaiChau]: "Hải Châu",
  [District.CamLe]: "Cẩm Lệ",
  [District.NguHanhSon]: "Ngũ Hành Sơn",
  [District.ThanhKhe]: "Thanh Khê",
  [District.SonTra]: "Sơn Trà",
};

export const DISTRICTS = Object.values(District);

/** Display label for a district value; falls back to the raw value. */
export const districtLabel = (d: string): string =>
  DISTRICT_LABELS[d as District] ?? d;

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
  district: z.enum(District),
  city: z.string(),
  palette: z.number(),
  amenities: z.array(z.string()),
  owner: z.string(),
  status: z.enum(["active", "draft"]),
  views: z.number(),
  available: z.string(),
  desc: z.string(),
  images: z.array(z.string()).optional(),
  // Exact location, set by the owner via the form's map pin. Absent on
  // legacy rows and seed data — display falls back to lib/geo coordsOf().
  lat: z.number().optional(),
  lng: z.number().optional(),
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
  | "lat"
  | "lng"
>;

/* Listing form schema — shared by the create and edit pages.
   Numeric fields are kept as strings while editing (native inputs/selects
   yield strings) and converted to numbers on submit via formToCore().
   Built from a translator (scoped to the `validation` namespace) so the
   field messages are localized. */
export const createListingFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().trim().min(1, t("listing.title")),
    type: z.string().min(1),
    price: z.string().refine((v) => Number(v) > 0, t("listing.price")),
    beds: z.string(),
    baths: z.string(),
    area: z.string(),
    district: z.string().min(1, t("listing.district")),
    desc: z.string(),
    amenities: z.array(z.string()),
    images: z.array(z.string()),
    available: z.string(),
    // Map pin — kept as numbers (set by the picker, not typed by hand).
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  });

export type ListingFormValues = z.infer<
  ReturnType<typeof createListingFormSchema>
>;

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
  lat: null,
  lng: null,
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
    lat: l.lat ?? null,
    lng: l.lng ?? null,
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
    district: v.district as District,
    city: "Da Nang",
    desc: v.desc,
    amenities: v.amenities,
    images: v.images,
    available: v.available,
    lat: v.lat ?? undefined,
    lng: v.lng ?? undefined,
  };
}
