import { z } from "zod";
import { routing } from "@/i18n/routing";

/* ============================================================
   Listing domain schemas + types.
   Reusable types are derived from the zod schemas (z.infer).
   Presentation config and display helpers live in @/lib/data/listings.
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

/* ---- Multilingual copy (improvement #14) ----
   A listing's two owner-authored strings in the locales the app serves.
   `title`/`desc` below hold the *base* copy — the language the owner wrote
   first, named by `baseLocale` — and `i18n` holds every other locale.

   Either field of a translation may be absent: a translated title with an
   untranslated description is the common case, and falls back per field
   rather than wholesale (see localizeListing). */

export const ListingTextSchema = z.object({
  title: z.string().optional(),
  desc: z.string().optional(),
});
export type ListingText = z.infer<typeof ListingTextSchema>;

/** Assumed base language of a listing that doesn't name one — fixtures, seed
    objects, and any row predating the column. Mirrors the `base_locale`
    column default in 20260802120000_listing_translations.sql. */
export const DEFAULT_BASE_LOCALE = "vi";

/** The locales this deploy serves, straight from i18n/routing.ts — so adding
    one there is all it takes for the form to offer it and the save actions to
    accept it. Reads stay on plain strings (see `Listing.i18n`); only writes
    are held to this list. */
export const LocaleSchema = z.enum(routing.locales);

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
  // Does this home have a published 360° tour? Server-owned: maintained by a
  // trigger on listing_virtual_tours, never written by the listing form.
  // Optional because seed objects and fixtures predate the column.
  hasVirtualTour: z.boolean().optional(),
  // The language `title` and `desc` are written in. Optional on the same
  // grounds as the fields above — absent means DEFAULT_BASE_LOCALE.
  baseLocale: z.string().optional(),
  // Owner-authored copy in every *other* locale, keyed by locale. Absent when
  // the owner wrote one language only, which is a normal state and not a
  // broken one — the same rule as `lat`/`lng`.
  i18n: z.record(z.string(), ListingTextSchema).optional(),
});
export type Listing = z.infer<typeof ListingSchema>;

/* ---- Locale resolution ----
   A listing whose copy has been resolved to one locale. `title`/`desc` are
   the strings to render; the two *Locale fields say where each actually came
   from, which is what lets the detail page tell a renter it is showing them a
   language they didn't ask for. `i18n` survives untouched, so a "show the
   original" affordance never needs a second read. */

export type LocalizedListing = Listing & {
  titleLocale: string;
  descLocale: string;
  /** The owner's own words, in the language they wrote them in — kept beside
      the resolved copy so a renter reading a translation can be offered the
      original without a second read. Equal to `title`/`desc` whenever nothing
      was translated away. */
  baseTitle: string;
  baseDesc: string;
};

/* An empty or whitespace-only translation is "not translated", never "this
   listing has no description" — a cleared textarea must fall back, not blank
   the page (improvement #14, requirement 2). */
const filled = (s: string | undefined): s is string => !!s && s.trim() !== "";

/** Resolve a listing's owner-authored copy to `locale`, per field, falling
    back to the base copy.

    Pure, and the locale is always an argument: this module runs in the
    browser as well as on the server, so it can never reach for getLocale()
    itself. Call it where a listing enters the tree — a page or section
    boundary — never inside a leaf component, so filtering and search still
    see every language (see filterListings). */
export function localizeListing(l: Listing, locale: string): LocalizedListing {
  const base = l.baseLocale ?? DEFAULT_BASE_LOCALE;
  const t = l.i18n?.[locale];
  const title = t?.title;
  const desc = t?.desc;

  return {
    ...l,
    title: filled(title) ? title : l.title,
    desc: filled(desc) ? desc : l.desc,
    titleLocale: filled(title) ? locale : base,
    descLocale: filled(desc) ? locale : base,
    baseTitle: l.title,
    baseDesc: l.desc,
  };
}

/** Every locale this listing has any owner-written copy in, its own language
    first. "Any" is per listing, not per field: a locale with a translated
    title and no description counts, because the owner did write it in that
    language.

    Owner-facing — it answers "which languages does this home have?" on a
    dashboard row without opening each one. Renters are never told this
    (improvement #14: whether a home has a translation is not interesting on a
    card), so keep it off reader surfaces. */
export function writtenLocales(l: Listing): string[] {
  const base = l.baseLocale ?? DEFAULT_BASE_LOCALE;
  const rest = Object.entries(l.i18n ?? {})
    .filter(
      ([locale, text]) =>
        locale !== base && (filled(text.title) || filled(text.desc))
    )
    .map(([locale]) => locale);
  return [base, ...rest];
}

/** localizeListing over a list — the usual call at a page boundary. */
export function localizeListings(
  listings: Listing[],
  locale: string
): LocalizedListing[] {
  return listings.map((l) => localizeListing(l, locale));
}

/* The editable core of a listing — everything except the server-owned
   fields (id, owner, views, palette, status). Shared by the create/edit
   flows, and re-validated by the save actions: this is the exact shape a
   client is allowed to send, so a direct POST can't smuggle in `views` or a
   foreign `owner`. */
export const ListingCoreSchema = ListingSchema.pick({
  title: true,
  type: true,
  price: true,
  beds: true,
  baths: true,
  area: true,
  district: true,
  city: true,
  desc: true,
  amenities: true,
  images: true,
  available: true,
  lat: true,
  lng: true,
  costs: true,
}).extend({
  /* The two multilingual fields are typed harder here than on `Listing`.
     A listing *read* from the database may carry any locale — a row written
     when the app served a third language must still parse — but a listing
     *written* by a client may only carry the locales this deploy serves. A
     save action is a public HTTP endpoint, and `z.record(z.string(), …)`
     would accept an unbounded map, which is an unbounded insert.

     Both stay optional: a `ListingCore` built before these existed (and every
     fixture) is still valid, and an absent `baseLocale` leaves the column at
     its default rather than relabelling the copy as Vietnamese. */
  baseLocale: LocaleSchema.optional(),
  i18n: z.partialRecord(LocaleSchema, ListingTextSchema).optional(),
});
export type ListingCore = z.infer<typeof ListingCoreSchema>;

/** Active or draft — the only status a client may ask for. */
export const ListingStatusSchema = ListingSchema.shape.status;

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

/* Per-locale copy while editing. Unlike the domain's `ListingText`, both
   fields are always present as strings — a controlled input has no "absent",
   only "". formToCore is what turns "" back into absent. */
const translationFormSchema = z.object({
  title: z.string(),
  desc: z.string(),
});

export const createListingFormSchema = (t: (key: string) => string) =>
  z.object({
    /* The original copy, and the language it is written in. Only this
       title is required: requirement 3 of improvement #14 is that an owner
       is never made to write twice before they can publish. */
    baseLocale: LocaleSchema,
    title: z.string().trim().min(1, t("listing.title")),
    type: z.string().min(1),
    price: z.string().refine((v) => Number(v) > 0, t("listing.price")),
    beds: z.string(),
    baths: z.string(),
    area: z.string().refine((v) => Number(v) > 0, t("listing.area")),
    district: z.string().min(1, t("listing.district")),
    desc: z.string(),
    amenities: z.array(z.string()),
    images: z.array(z.string()),
    available: z.string(),
    // Map pin — kept as numbers (set by the picker, not typed by hand).
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    costs: costsFormSchema,
    /* One entry per locale the app serves, including the base one — whose
       entry is simply never read (the original is `title`/`desc` above, and
       toTranslationRows drops it). Keeping the map complete means the form
       never has to ask whether a language has an entry yet. */
    i18n: z.record(LocaleSchema, translationFormSchema),
  });

export type ListingFormValues = z.infer<
  ReturnType<typeof createListingFormSchema>
>;

/** An empty entry for every configured locale. Adding one to i18n/routing.ts
    grows the form by itself — no edit here, which is the whole point of
    keying on `routing.locales` rather than naming languages. */
export const blankTranslationForms = (): ListingFormValues["i18n"] =>
  Object.fromEntries(
    routing.locales.map((l) => [l, { title: "", desc: "" }])
  ) as ListingFormValues["i18n"];

export const blankListingForm: ListingFormValues = {
  // Overridden with the locale the owner is authoring in (see listing-form).
  baseLocale: routing.defaultLocale,
  i18n: blankTranslationForms(),
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

/* Populate the form from an existing listing (edit mode).

   `title`/`desc` are the *base* copy — the language named by `baseLocale` —
   never a resolved translation. The action that feeds this deliberately skips
   localization for exactly that reason: prefilling with the English of a
   Vietnamese listing would overwrite the original on the next save. */
export function listingToForm(l: Listing): ListingFormValues {
  const i18n = blankTranslationForms();
  for (const locale of routing.locales) {
    const t = l.i18n?.[locale];
    if (t) i18n[locale] = { title: t.title ?? "", desc: t.desc ?? "" };
  }

  return {
    baseLocale: (routing.locales as readonly string[]).includes(
      l.baseLocale ?? ""
    )
      ? (l.baseLocale as ListingFormValues["baseLocale"])
      : DEFAULT_BASE_LOCALE,
    i18n,
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
  /* Blank tabs are dropped, not saved as empty strings: "" means "not
     translated" everywhere else (localizeListing falls back on it, the
     mapping drops it, and the table's not-empty constraint rejects a row
     that is blank in both fields). Clearing both fields is therefore how an
     owner deletes a translation — the service removes the row for a locale
     that doesn't come back. The base locale's entry is never read; that copy
     lives in `title`/`desc`. */
  const i18n: Record<string, ListingText> = {};
  for (const [locale, text] of Object.entries(v.i18n)) {
    if (locale === v.baseLocale) continue;
    const entry: ListingText = {};
    if (text.title.trim()) entry.title = text.title.trim();
    if (text.desc.trim()) entry.desc = text.desc;
    if (entry.title || entry.desc) i18n[locale] = entry;
  }

  /* Always present, even when empty: the core a save action receives is the
     complete desired state of the listing's copy, so an empty map is a
     meaningful instruction ("this listing has no translations") rather than
     a missing field the service would have to guess about. */
  return {
    baseLocale: v.baseLocale,
    i18n,
    title: v.title.trim(),
    type: v.type,
    price: Number(v.price),
    beds: Number(v.beds),
    baths: Number(v.baths),
    area: Number(v.area),
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
