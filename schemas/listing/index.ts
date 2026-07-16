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

/* ---- Costs & terms (improvement #13) ----
   A listing's money questions: deposit, per-utility billing, minimum lease.
   Every field is optional — an absent value means the owner hasn't listed
   it ("not listed"), which must never read as "free" or zero. */

export const DEPOSIT_TYPES = ["none", "1mo", "2mo", "custom"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const UTILITY_IDS = ["electricity", "water", "wifi", "building"] as const;
export type UtilityId = (typeof UTILITY_IDS)[number];

export const UTILITY_BILLING = ["included", "metered", "fixed"] as const;
export type UtilityBilling = (typeof UTILITY_BILLING)[number];

const UtilityModeSchema = z.enum(UTILITY_BILLING).optional();

export const ListingCostsSchema = z.object({
  deposit: z.enum(DEPOSIT_TYPES).optional(),
  // USD — only meaningful when deposit === "custom".
  depositAmount: z.number().optional(),
  util: z.object({
    electricity: UtilityModeSchema,
    water: UtilityModeSchema,
    wifi: UtilityModeSchema,
    building: UtilityModeSchema,
  }),
  // Fixed monthly USD amounts — only meaningful where util[id] === "fixed".
  amt: z.object({
    electricity: z.number().optional(),
    water: z.number().optional(),
    wifi: z.number().optional(),
    building: z.number().optional(),
  }),
  // Months. 0 = explicitly no minimum; absent = not listed.
  minLease: z.number().optional(),
});
export type ListingCosts = z.infer<typeof ListingCostsSchema>;

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
  // Row creation timestamp (ISO), used by the "Newest" sort. Absent on
  // legacy seed objects, which are never sorted for browse.
  createdAt: z.string().optional(),
  // Exact location, set by the owner via the form's map pin. Absent on
  // legacy rows and seed data — display falls back to lib/geo coordsOf().
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Costs & terms. Absent when the owner has listed none of them.
  costs: ListingCostsSchema.optional(),
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
  | "costs"
>;

/* Listing form schema — shared by the create and edit pages.
   Numeric fields are kept as strings while editing (native inputs/selects
   yield strings) and converted to numbers on submit via formToCore().
   Built from a translator (scoped to the `validation` namespace) so the
   field messages are localized. */
/* Costs & terms while editing: every value is a string ("" = not listed).
   `minLease` holds "none" for an explicit no-minimum, otherwise months. */
const utilityStringsSchema = z.object({
  electricity: z.string(),
  water: z.string(),
  wifi: z.string(),
  building: z.string(),
});

const costsFormSchema = z.object({
  deposit: z.string(),
  depositAmount: z.string(),
  util: utilityStringsSchema,
  amt: utilityStringsSchema,
  minLease: z.string(),
});

export type CostsFormValues = z.infer<typeof costsFormSchema>;

export const blankCostsForm: CostsFormValues = {
  deposit: "",
  depositAmount: "",
  util: { electricity: "", water: "", wifi: "", building: "" },
  amt: { electricity: "", water: "", wifi: "", building: "" },
  minLease: "",
};

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
    costs: costsFormSchema,
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
  costs: blankCostsForm,
};

/* Costs: form strings → domain values. Returns undefined when the owner
   listed nothing, so untouched listings keep an absent `costs`. */
export function formCostsToCore(c: CostsFormValues): ListingCosts | undefined {
  const num = (s: string) => (Number(s) > 0 ? Number(s) : undefined);
  const mode = (s: string) =>
    (UTILITY_BILLING as readonly string[]).includes(s)
      ? (s as UtilityBilling)
      : undefined;
  const util = {
    electricity: mode(c.util.electricity),
    water: mode(c.util.water),
    wifi: mode(c.util.wifi),
    building: mode(c.util.building),
  };
  const amt = {
    electricity: util.electricity === "fixed" ? num(c.amt.electricity) : undefined,
    water: util.water === "fixed" ? num(c.amt.water) : undefined,
    wifi: util.wifi === "fixed" ? num(c.amt.wifi) : undefined,
    building: util.building === "fixed" ? num(c.amt.building) : undefined,
  };
  const costs: ListingCosts = {
    deposit: (DEPOSIT_TYPES as readonly string[]).includes(c.deposit)
      ? (c.deposit as DepositType)
      : undefined,
    depositAmount: c.deposit === "custom" ? num(c.depositAmount) : undefined,
    util,
    amt,
    minLease: c.minLease === "none" ? 0 : num(c.minLease),
  };
  const any =
    costs.deposit !== undefined ||
    costs.minLease !== undefined ||
    UTILITY_IDS.some((id) => util[id] !== undefined);
  return any ? costs : undefined;
}

/* Costs: domain values → form strings (edit mode). */
export function costsToForm(costs: Listing["costs"]): CostsFormValues {
  if (!costs) return blankCostsForm;
  const str = (n: number | undefined) => (n != null ? String(n) : "");
  return {
    deposit: costs.deposit ?? "",
    depositAmount: str(costs.depositAmount),
    util: {
      electricity: costs.util.electricity ?? "",
      water: costs.util.water ?? "",
      wifi: costs.util.wifi ?? "",
      building: costs.util.building ?? "",
    },
    amt: {
      electricity: str(costs.amt.electricity),
      water: str(costs.amt.water),
      wifi: str(costs.amt.wifi),
      building: str(costs.amt.building),
    },
    minLease:
      costs.minLease === 0 ? "none" : costs.minLease != null ? String(costs.minLease) : "",
  };
}

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
    costs: costsToForm(l.costs),
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
    costs: formCostsToCore(v.costs),
  };
}
