import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeFilterCount,
  filterListings,
  getDistricts,
  PAGE_SIZE,
  parseFilters,
  parsePage,
  parseSort,
} from "../query";
import { DEFAULT_FILTERS, type Filters } from "@/schemas/filters";
import { District } from "@/schemas/listing";
import { makeListing } from "@/tests/factories";

/* The URL is the single source of truth for browse state, so everything here
   parses hostile input: hand-edited query strings, repeated params, junk
   values. Nothing may throw — unknown values fall back to a default. */

const filters = (overrides: Partial<Filters> = {}): Filters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("parseFilters", () => {
  it("falls back to the defaults for an empty query", () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it("takes the first value when a param is repeated", () => {
    // Next gives string[] for ?district=a&district=b; the UI only ever means one.
    expect(parseFilters({ district: ["hai-chau", "son-tra"] }).district).toBe(
      "hai-chau"
    );
  });

  it("splits amenities on commas and drops empty segments", () => {
    expect(parseFilters({ amenities: "wifi,,parking" }).amenities).toEqual([
      "wifi",
      "parking",
    ]);
    expect(parseFilters({ amenities: "" }).amenities).toEqual([]);
  });

  it("ignores an availability horizon outside the known set", () => {
    expect(parseFilters({ avail: "2w" }).avail).toBe("2w");
    expect(parseFilters({ avail: "next-decade" }).avail).toBe("any");
  });
});

describe("parseSort", () => {
  it("accepts every known sort key", () => {
    for (const key of ["featured", "newest", "low", "high", "area"] as const) {
      expect(parseSort({ sort: key })).toBe(key);
    }
  });

  it("falls back to featured for anything unknown or absent", () => {
    expect(parseSort({})).toBe("featured");
    expect(parseSort({ sort: "cheapest" })).toBe("featured");
  });
});

describe("parsePage", () => {
  it("defaults to page 1 for missing, non-numeric or out-of-range input", () => {
    expect(parsePage({})).toBe(1);
    expect(parsePage({ page: "abc" })).toBe(1);
    expect(parsePage({ page: "0" })).toBe(1);
    expect(parsePage({ page: "-3" })).toBe(1);
    expect(parsePage({ page: "Infinity" })).toBe(1);
  });

  it("floors a fractional page", () => {
    expect(parsePage({ page: "2.9" })).toBe(2);
  });
});

describe("filterListings", () => {
  const base = [
    makeListing({ id: "a", title: "Riverside loft", type: "Loft", price: 300, beds: 0, area: 25, district: District.HaiChau, owner: "you" }),
    makeListing({ id: "b", title: "Beach house", type: "House", price: 900, beds: 3, area: 90, district: District.SonTra, owner: "maya" }),
    makeListing({ id: "c", title: "Quiet studio", type: "Studio", price: 500, beds: 2, area: 45, district: District.HaiChau, owner: "you" }),
  ];

  const ids = (ls: ReturnType<typeof filterListings>) => ls.map((l) => l.id);

  it("drops drafts before any other predicate runs", () => {
    const withDraft = [...base, makeListing({ id: "d", status: "draft" })];
    expect(ids(filterListings(withDraft, filters(), "featured"))).not.toContain("d");
  });

  it("matches the text query against title, district and type", () => {
    expect(ids(filterListings(base, filters({ q: "loft" }), "featured"))).toEqual(["a"]);
    expect(ids(filterListings(base, filters({ q: "HOUSE" }), "featured"))).toEqual(["b"]);
    // District label, not just the slug.
    expect(ids(filterListings(base, filters({ q: "Sơn Trà" }), "featured"))).toEqual(["b"]);
  });

  it("filters by type, district and owner", () => {
    expect(ids(filterListings(base, filters({ type: "House" }), "featured"))).toEqual(["b"]);
    expect(
      ids(filterListings(base, filters({ district: District.HaiChau }), "featured"))
    ).toEqual(["a", "c"]);
    expect(ids(filterListings(base, filters({ owner: "maya" }), "featured"))).toEqual(["b"]);
  });

  it("filters by price range inclusively", () => {
    expect(
      ids(filterListings(base, filters({ minPrice: "500", maxPrice: "900" }), "featured"))
    ).toEqual(["b", "c"]);
    // The boundaries themselves are included.
    expect(
      ids(filterListings(base, filters({ minPrice: "300", maxPrice: "300" }), "featured"))
    ).toEqual(["a"]);
  });

  it("treats Studio as zero beds and 3+ as an open upper bound", () => {
    expect(ids(filterListings(base, filters({ beds: "Studio" }), "featured"))).toEqual(["a"]);
    expect(ids(filterListings(base, filters({ beds: "3+" }), "featured"))).toEqual(["b"]);
    expect(ids(filterListings(base, filters({ beds: "2" }), "featured"))).toEqual(["c"]);
  });

  it("filters by minimum area", () => {
    expect(ids(filterListings(base, filters({ minArea: "45" }), "featured"))).toEqual(["b", "c"]);
  });

  it("requires every selected amenity, not just one", () => {
    const withAmenities = [
      makeListing({ id: "x", amenities: ["wifi"] }),
      makeListing({ id: "y", amenities: ["wifi", "parking"] }),
    ];
    expect(
      ids(filterListings(withAmenities, filters({ amenities: ["wifi", "parking"] }), "featured"))
    ).toEqual(["y"]);
  });

  it("combines predicates", () => {
    expect(
      ids(
        filterListings(
          base,
          filters({ district: District.HaiChau, minPrice: "400" }),
          "featured"
        )
      )
    ).toEqual(["c"]);
  });

  it("returns nothing when a query matches no listing", () => {
    expect(filterListings(base, filters({ q: "zzzz" }), "featured")).toEqual([]);
  });

  describe("availability horizons", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T09:00:00"));
    });
    afterEach(() => vi.useRealTimers());

    const dated = [
      makeListing({ id: "now", available: "now" }),
      makeListing({ id: "soon", available: "2026-06-20" }), // +5 days
      makeListing({ id: "later", available: "2026-07-30" }), // +45 days
    ];

    it("is cumulative — a nearer horizon still includes available-now", () => {
      expect(ids(filterListings(dated, filters({ avail: "1w" }), "featured"))).toEqual([
        "now",
        "soon",
      ]);
    });

    it("widens with the horizon", () => {
      expect(ids(filterListings(dated, filters({ avail: "now" }), "featured"))).toEqual(["now"]);
      expect(ids(filterListings(dated, filters({ avail: "1m" }), "featured"))).toEqual([
        "now",
        "soon",
      ]);
    });

    it("applies no date filter at all for 'any'", () => {
      expect(ids(filterListings(dated, filters({ avail: "any" }), "featured"))).toHaveLength(3);
    });
  });

  describe("sorting", () => {
    it("orders by price ascending and descending", () => {
      expect(ids(filterListings(base, filters(), "low"))).toEqual(["a", "c", "b"]);
      expect(ids(filterListings(base, filters(), "high"))).toEqual(["b", "c", "a"]);
    });

    it("orders by area, largest first", () => {
      expect(ids(filterListings(base, filters(), "area"))).toEqual(["b", "c", "a"]);
    });

    it("orders by creation date, newest first", () => {
      const withDates = [
        makeListing({ id: "old", createdAt: "2026-01-01T00:00:00Z" }),
        makeListing({ id: "new", createdAt: "2026-06-01T00:00:00Z" }),
      ];
      expect(ids(filterListings(withDates, filters(), "newest"))).toEqual(["new", "old"]);
    });

    it("leaves the source order untouched for 'featured'", () => {
      expect(ids(filterListings(base, filters(), "featured"))).toEqual(["a", "b", "c"]);
    });

    it("does not mutate the input array", () => {
      const input = [...base];
      filterListings(input, filters(), "high");
      expect(ids(input)).toEqual(["a", "b", "c"]);
    });
  });
});

describe("getDistricts", () => {
  it("returns unique active districts sorted by their display label", () => {
    const listings = [
      makeListing({ district: District.SonTra }),
      makeListing({ district: District.HaiChau }),
      makeListing({ district: District.SonTra }),
      makeListing({ district: District.CamLe, status: "draft" }),
    ];
    // "Hải Châu" before "Sơn Trà"; the draft's district is absent.
    expect(getDistricts(listings)).toEqual([District.HaiChau, District.SonTra]);
  });
});

describe("activeFilterCount", () => {
  it("is zero for the default filters", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it("counts each narrowed field, with amenities counting individually", () => {
    expect(
      activeFilterCount(
        filters({ type: "House", minPrice: "300", amenities: ["wifi", "parking"] })
      )
    ).toBe(4);
  });

  it("ignores the free-text query, which has its own input", () => {
    expect(activeFilterCount(filters({ q: "beach" }))).toBe(0);
  });
});

describe("PAGE_SIZE", () => {
  it("is a positive page size the pagination can divide by", () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });
});
