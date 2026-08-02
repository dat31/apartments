import { describe, expect, it } from "vitest";
import {
  blankCostsForm,
  blankListingForm,
  costsToForm,
  createListingFormSchema,
  District,
  districtLabel,
  DISTRICTS,
  formCostsToCore,
  formToCore,
  listingToForm,
  localizeListing,
  localizeListings,
  type CostsFormValues,
} from "@/schemas/listing";
import { makeListing } from "@/tests/factories";

const t = (key: string) => key;
const costsForm = (overrides: Partial<CostsFormValues> = {}): CostsFormValues => ({
  ...blankCostsForm,
  ...overrides,
});

describe("districtLabel", () => {
  it("gives the human-readable name for every district", () => {
    expect(districtLabel(District.HaiChau)).toBe("Hải Châu");
    for (const d of DISTRICTS) {
      expect(districtLabel(d)).not.toBe("");
    }
  });

  it("falls back to the raw value for an unknown district", () => {
    // Legacy rows and hand-edited URLs shouldn't render as blank.
    expect(districtLabel("atlantis")).toBe("atlantis");
  });
});

describe("formCostsToCore", () => {
  it("returns undefined when the owner listed nothing", () => {
    // An untouched form must leave `costs` absent, not create an empty object.
    expect(formCostsToCore(blankCostsForm)).toBeUndefined();
  });

  it("converts a deposit selection", () => {
    expect(formCostsToCore(costsForm({ deposit: "1mo" }))?.deposit).toBe("1mo");
  });

  it("ignores a deposit value outside the known set", () => {
    expect(formCostsToCore(costsForm({ deposit: "haggle" }))).toBeUndefined();
  });

  it("keeps the custom amount only for a custom deposit", () => {
    expect(
      formCostsToCore(costsForm({ deposit: "custom", depositAmount: "750" }))?.depositAmount
    ).toBe(750);
    expect(
      formCostsToCore(costsForm({ deposit: "1mo", depositAmount: "750" }))?.depositAmount
    ).toBeUndefined();
  });

  it("treats an explicit no-minimum lease as 0, and a blank one as absent", () => {
    // 0 and undefined mean different things: "no minimum" vs "not listed".
    expect(formCostsToCore(costsForm({ minLease: "none" }))?.minLease).toBe(0);
    expect(formCostsToCore(costsForm({ deposit: "1mo", minLease: "" }))?.minLease).toBeUndefined();
    expect(formCostsToCore(costsForm({ minLease: "6" }))?.minLease).toBe(6);
  });

  it("keeps a utility amount only where the mode is fixed", () => {
    const withFixed = formCostsToCore(
      costsForm({
        util: { ...blankCostsForm.util, wifi: "fixed" },
        amt: { ...blankCostsForm.amt, wifi: "10" },
      })
    );
    expect(withFixed?.amt.wifi).toBe(10);

    const withMetered = formCostsToCore(
      costsForm({
        util: { ...blankCostsForm.util, wifi: "metered" },
        amt: { ...blankCostsForm.amt, wifi: "10" },
      })
    );
    expect(withMetered?.amt.wifi).toBeUndefined();
  });

  it("drops non-positive and non-numeric amounts", () => {
    const costs = formCostsToCore(
      costsForm({
        util: { ...blankCostsForm.util, wifi: "fixed" },
        amt: { ...blankCostsForm.amt, wifi: "0" },
      })
    );
    expect(costs?.amt.wifi).toBeUndefined();
  });

  it("ignores an unrecognised billing mode", () => {
    expect(
      formCostsToCore(costsForm({ util: { ...blankCostsForm.util, wifi: "barter" } }))
    ).toBeUndefined();
  });
});

describe("costsToForm", () => {
  it("returns the blank form for a listing with no costs", () => {
    expect(costsToForm(undefined)).toEqual(blankCostsForm);
  });

  it("renders a zero minimum lease as the explicit 'none' option", () => {
    expect(costsToForm({ util: {}, amt: {}, minLease: 0 }).minLease).toBe("none");
  });

  it("renders an absent minimum lease as an empty string", () => {
    expect(costsToForm({ util: {}, amt: {} }).minLease).toBe("");
  });

  it("round-trips a fully populated cost set", () => {
    const original = costsForm({
      deposit: "custom",
      depositAmount: "750",
      minLease: "6",
      util: { electricity: "metered", water: "included", wifi: "fixed", building: "included" },
      amt: { electricity: "", water: "", wifi: "10", building: "" },
    });
    expect(costsToForm(formCostsToCore(original))).toEqual(original);
  });

  it("round-trips the explicit no-deposit, no-minimum case", () => {
    const original = costsForm({ deposit: "none", minLease: "none" });
    expect(costsToForm(formCostsToCore(original))).toEqual(original);
  });
});

describe("listingToForm", () => {
  it("stringifies the numeric fields the inputs hold as text", () => {
    const form = listingToForm(makeListing({ price: 400, beds: 2, baths: 1, area: 35 }));
    expect(form.price).toBe("400");
    expect(form.beds).toBe("2");
    expect(form.area).toBe("35");
  });

  it("normalises a missing pin to null, which the picker expects", () => {
    const form = listingToForm(makeListing({ lat: undefined, lng: undefined }));
    expect(form.lat).toBeNull();
    expect(form.lng).toBeNull();
  });

  it("keeps a stored pin", () => {
    const form = listingToForm(makeListing({ lat: 16.05, lng: 108.22 }));
    expect(form.lat).toBe(16.05);
  });

  it("defaults a blank availability to 'now'", () => {
    expect(listingToForm(makeListing({ available: "" })).available).toBe("now");
  });

  it("defaults absent amenities and images to empty arrays", () => {
    const form = listingToForm(makeListing({ images: undefined }));
    expect(form.images).toEqual([]);
    expect(form.amenities).toEqual([]);
  });
});

describe("formToCore", () => {
  const filled = {
    ...blankListingForm,
    title: "  Sunlit studio  ",
    price: "400",
    beds: "2",
    baths: "1",
    area: "35",
    district: District.HaiChau,
  };

  it("parses the numeric strings back to numbers", () => {
    const core = formToCore(filled);
    expect(core.price).toBe(400);
    expect(core.beds).toBe(2);
    expect(core.area).toBe(35);
  });

  it("trims the title", () => {
    expect(formToCore(filled).title).toBe("Sunlit studio");
  });

  it("pins the city, which the form never asks for", () => {
    expect(formToCore(filled).city).toBe("Da Nang");
  });

  it("converts a null pin to undefined for the domain object", () => {
    const core = formToCore({ ...filled, lat: null, lng: null });
    expect(core.lat).toBeUndefined();
    expect(core.lng).toBeUndefined();
  });

  it("leaves costs absent when the owner listed none", () => {
    expect(formToCore(filled).costs).toBeUndefined();
  });

  it("round-trips a listing through the form and back", () => {
    const listing = makeListing({
      title: "Riverside loft",
      price: 650,
      beds: 2,
      baths: 2,
      area: 70,
      district: District.SonTra,
      amenities: ["wifi"],
      lat: 16.07,
      lng: 108.24,
      costs: { deposit: "1mo", util: {}, amt: {}, minLease: 6 },
    });
    const core = formToCore(listingToForm(listing));
    expect(core).toMatchObject({
      title: listing.title,
      price: listing.price,
      beds: listing.beds,
      area: listing.area,
      district: listing.district,
      amenities: listing.amenities,
      lat: listing.lat,
      lng: listing.lng,
    });
    expect(core.costs?.deposit).toBe("1mo");
    expect(core.costs?.minLease).toBe(6);
  });
});

describe("createListingFormSchema", () => {
  const schema = createListingFormSchema(t);
  const valid = {
    ...blankListingForm,
    title: "A home",
    price: "400",
    area: "35",
    district: District.HaiChau,
  };

  it("accepts a filled-in form", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects a blank or whitespace-only title", () => {
    expect(schema.safeParse({ ...valid, title: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejects a non-positive or non-numeric price", () => {
    for (const price of ["0", "-5", "", "free"]) {
      expect(schema.safeParse({ ...valid, price }).success).toBe(false);
    }
  });

  it("rejects a non-positive area", () => {
    expect(schema.safeParse({ ...valid, area: "0" }).success).toBe(false);
  });

  it("rejects a missing district", () => {
    expect(schema.safeParse({ ...valid, district: "" }).success).toBe(false);
  });

  it("reports the localized message key for the failing field", () => {
    const result = schema.safeParse({ ...valid, price: "0" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("listing.price");
    }
  });
});

describe("localizeListing", () => {
  /* The fixture is English-based, so `vi` is the translated side here. */
  const bilingual = () =>
    makeListing({
      title: "Sunlit studio near Mỹ Khê",
      desc: "A bright little place.",
      baseLocale: "en",
      i18n: { vi: { title: "Studio đón nắng gần Mỹ Khê", desc: "Một nơi sáng sủa." } },
    });

  it("uses the translation when the locale has one", () => {
    const l = localizeListing(bilingual(), "vi");
    expect(l.title).toBe("Studio đón nắng gần Mỹ Khê");
    expect(l.desc).toBe("Một nơi sáng sủa.");
    expect(l.titleLocale).toBe("vi");
    expect(l.descLocale).toBe("vi");
  });

  it("falls back to the base copy for a locale with no translation", () => {
    const l = localizeListing(bilingual(), "ko");
    expect(l.title).toBe("Sunlit studio near Mỹ Khê");
    expect(l.titleLocale).toBe("en");
    expect(l.descLocale).toBe("en");
  });

  it("asked for the base locale, returns the base copy", () => {
    const l = localizeListing(bilingual(), "en");
    expect(l.title).toBe("Sunlit studio near Mỹ Khê");
    expect(l.titleLocale).toBe("en");
  });

  /* The common real case: owners translate the headline and skip the body. */
  it("falls back per field, not wholesale", () => {
    const listing = makeListing({
      title: "Sunlit studio near Mỹ Khê",
      desc: "A bright little place.",
      baseLocale: "en",
      i18n: { vi: { title: "Studio đón nắng gần Mỹ Khê" } },
    });
    const l = localizeListing(listing, "vi");
    expect(l.title).toBe("Studio đón nắng gần Mỹ Khê");
    expect(l.titleLocale).toBe("vi");
    // The description keeps the language that actually has one.
    expect(l.desc).toBe("A bright little place.");
    expect(l.descLocale).toBe("en");
  });

  /* A cleared textarea must read as "not translated", never as "this listing
     has no description" — improvement #14, requirement 2. */
  it("treats a blank or whitespace-only translation as absent", () => {
    const listing = makeListing({
      title: "Sunlit studio near Mỹ Khê",
      desc: "A bright little place.",
      baseLocale: "en",
      i18n: { vi: { title: "   ", desc: "" } },
    });
    const l = localizeListing(listing, "vi");
    expect(l.title).toBe("Sunlit studio near Mỹ Khê");
    expect(l.desc).toBe("A bright little place.");
    expect(l.descLocale).toBe("en");
  });

  it("assumes the default base locale when a listing names none", () => {
    const rest = makeListing();
    delete rest.baseLocale;
    const l = localizeListing(rest, "en");
    expect(l.titleLocale).toBe("vi");
  });

  it("leaves the translations on the object for a show-original affordance", () => {
    const l = localizeListing(bilingual(), "vi");
    expect(l.i18n?.en).toBeUndefined();
    expect(l.i18n?.vi?.title).toBe("Studio đón nắng gần Mỹ Khê");
  });

  it("does not mutate the listing it was given", () => {
    const listing = bilingual();
    localizeListing(listing, "vi");
    expect(listing.title).toBe("Sunlit studio near Mỹ Khê");
  });

  it("localizeListings maps the whole list", () => {
    const out = localizeListings([bilingual(), bilingual()], "vi");
    expect(out.map((l) => l.title)).toEqual([
      "Studio đón nắng gần Mỹ Khê",
      "Studio đón nắng gần Mỹ Khê",
    ]);
  });
});
