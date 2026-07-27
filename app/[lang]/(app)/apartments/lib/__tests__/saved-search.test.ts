import { describe, expect, it } from "vitest";
import {
  countMatches,
  describeSearch,
  filtersToQuery,
  queryToFilters,
  savableFilterCount,
  searchSignature,
} from "../saved-search";
import { DEFAULT_FILTERS, type Filters } from "@/schemas/filters";
import { District } from "@/schemas/listing";
import { makeListing } from "@/tests/factories";

const filters = (overrides: Partial<Filters> = {}): Filters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("filtersToQuery", () => {
  it("serializes nothing for the default filters", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe("");
  });

  it("omits each field that still holds its default", () => {
    expect(filtersToQuery(filters({ type: "House" }))).toBe("type=House");
  });

  it("trims the keyword and drops a whitespace-only one", () => {
    expect(filtersToQuery(filters({ q: "  beach  " }))).toBe("q=beach");
    expect(filtersToQuery(filters({ q: "   " }))).toBe("");
  });

  it("joins amenities with commas", () => {
    expect(filtersToQuery(filters({ amenities: ["wifi", "parking"] }))).toContain(
      "amenities=wifi%2Cparking"
    );
  });

  it("is stable — the same filters always produce the same string", () => {
    const f = filters({ type: "House", district: District.SonTra, maxPrice: "900" });
    expect(filtersToQuery(f)).toBe(filtersToQuery({ ...f }));
  });
});

describe("queryToFilters", () => {
  it("round-trips a fully populated filter set", () => {
    const original = filters({
      q: "beach",
      type: "House",
      district: District.SonTra,
      minPrice: "300",
      maxPrice: "900",
      beds: "2",
      avail: "2w",
      minArea: "40",
      amenities: ["wifi", "parking"],
      owner: "maya",
    });
    expect(queryToFilters(filtersToQuery(original))).toEqual(original);
  });

  it("returns the defaults for an empty query", () => {
    expect(queryToFilters("")).toEqual(DEFAULT_FILTERS);
  });

  it("ignores unknown params rather than choking on them", () => {
    expect(queryToFilters("type=House&nonsense=1")).toEqual(filters({ type: "House" }));
  });
});

describe("searchSignature", () => {
  it("matches for two identical searches", () => {
    expect(searchSignature(filters({ type: "House" }))).toBe(
      searchSignature(filters({ type: "House" }))
    );
  });

  it("ignores amenity ordering — the whole point of the fingerprint", () => {
    expect(searchSignature(filters({ amenities: ["wifi", "parking"] }))).toBe(
      searchSignature(filters({ amenities: ["parking", "wifi"] }))
    );
  });

  it("ignores keyword case and surrounding whitespace", () => {
    expect(searchSignature(filters({ q: "  Beach " }))).toBe(
      searchSignature(filters({ q: "beach" }))
    );
  });

  it("differs when any meaningful field differs", () => {
    expect(searchSignature(filters({ type: "House" }))).not.toBe(
      searchSignature(filters({ type: "Loft" }))
    );
    expect(searchSignature(filters({ maxPrice: "900" }))).not.toBe(
      searchSignature(filters({ maxPrice: "800" }))
    );
  });

  it("does not mutate the caller's amenity array while sorting", () => {
    const f = filters({ amenities: ["wifi", "parking"] });
    searchSignature(f);
    expect(f.amenities).toEqual(["wifi", "parking"]);
  });
});

describe("savableFilterCount", () => {
  it("is zero for an untouched search", () => {
    expect(savableFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it("counts the keyword, which the panel badge deliberately leaves out", () => {
    expect(savableFilterCount(filters({ q: "beach" }))).toBe(1);
    expect(savableFilterCount(filters({ q: "   " }))).toBe(0);
  });

  it("adds the keyword to the panel's own active count", () => {
    expect(savableFilterCount(filters({ q: "beach", type: "House", minPrice: "300" }))).toBe(3);
  });
});

describe("countMatches", () => {
  const listings = [
    makeListing({ id: "a", type: "House", price: 900, district: District.SonTra }),
    makeListing({ id: "b", type: "Studio", price: 300, district: District.HaiChau }),
    makeListing({ id: "c", type: "House", price: 400, district: District.HaiChau }),
    makeListing({ id: "d", type: "House", price: 400, status: "draft" }),
  ];

  it("counts every active listing for an empty search", () => {
    expect(countMatches(listings, "")).toBe(3);
  });

  it("counts only the matches for a narrowed search", () => {
    expect(countMatches(listings, filtersToQuery(filters({ type: "House" })))).toBe(2);
  });

  it("never counts drafts", () => {
    expect(countMatches(listings, filtersToQuery(filters({ maxPrice: "400" })))).toBe(2);
  });

  it("returns zero when nothing matches", () => {
    expect(countMatches(listings, filtersToQuery(filters({ q: "zzzz" })))).toBe(0);
  });
});

describe("describeSearch", () => {
  /* The real translator is next-intl; an echoing stub keeps the assertions
     about structure rather than about Vietnamese copy. It echoes only the
     last key segment because describeSearch nests templates and then caps the
     name at 80 characters — full keys would be truncated away. */
  const ctx = {
    t: (key: string, values?: Record<string, string | number>) => {
      const leaf = key.split(".").pop()!;
      return values ? `${leaf}(${Object.values(values).join("|")})` : leaf;
    },
    money: (usd: number) => `$${usd}`,
  };

  it("names a bare keyword search with just the quoted term", () => {
    expect(describeSearch(filters({ q: "beach" }), ctx).name).toBe("“beach”");
  });

  it("builds a sentence from the narrowed fields", () => {
    const { name } = describeSearch(
      filters({ type: "House", district: District.HaiChau, maxPrice: "900" }),
      ctx
    );
    expect(name).toContain("House");
    expect(name).toContain("Hải Châu");
    expect(name).toContain("$900");
    // Narrower qualifiers wrap the noun, so the price form is outermost.
    expect(name.startsWith("under(")).toBe(true);
  });

  it("uses the between-form when both price bounds are set", () => {
    const { name } = describeSearch(filters({ minPrice: "300", maxPrice: "900" }), ctx);
    expect(name).toContain("between");
    expect(name).toContain("$300");
    expect(name).toContain("$900");
  });

  it("uses the over-form when only a minimum price is set", () => {
    const { name, chips } = describeSearch(filters({ minPrice: "300" }), ctx);
    expect(name).toContain("over");
    expect(chips).toContain("over($300)");
  });

  it("labels bed counts, with special cases for Studio and 3+", () => {
    expect(describeSearch(filters({ beds: "Studio" }), ctx).chips).toContain("studio");
    expect(describeSearch(filters({ beds: "3+" }), ctx).chips).toContain("bedsThreePlus");
    expect(describeSearch(filters({ beds: "2" }), ctx).chips).toContain("beds(2)");
  });

  it("chips the availability horizon and the owner filter", () => {
    expect(describeSearch(filters({ avail: "2w" }), ctx).chips).toContain("2w");
    expect(describeSearch(filters({ owner: "maya" }), ctx).chips).toContain("owner");
  });

  it("keeps the sentence form when a keyword is combined with a filter", () => {
    // The bare-keyword shortcut only applies when the keyword is the only thing set.
    const { name } = describeSearch(filters({ q: "beach", type: "House" }), ctx);
    expect(name).not.toBe("“beach”");
    expect(name).toContain("House");
  });

  it("caps the name so it can't overflow the card", () => {
    const { name } = describeSearch(filters({ q: "x".repeat(200) }), ctx);
    expect(name.length).toBeLessThanOrEqual(80);
  });

  it("emits one chip per set filter and none for the defaults", () => {
    expect(describeSearch(DEFAULT_FILTERS, ctx).chips).toEqual([]);
    const { chips } = describeSearch(
      filters({ q: "beach", type: "House", minArea: "40", amenities: ["wifi"] }),
      ctx
    );
    expect(chips).toContain("“beach”");
    expect(chips).toContain("40 m²+");
    expect(chips).toContain("wifi"); // t("amenities.wifi") → leaf
    expect(chips).toHaveLength(4);
  });
});
