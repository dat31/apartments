import { describe, expect, it } from "vitest";
import {
  getDistrictTiles,
  getNewest,
  getTrending,
  SHOWCASE_SIZE,
} from "../landing";
import { District } from "@/schemas/listing";
import { makeListing } from "@/tests/factories";

describe("getDistrictTiles", () => {
  it("returns nothing for an empty or all-draft list", () => {
    expect(getDistrictTiles([])).toEqual([]);
    expect(getDistrictTiles([makeListing({ status: "draft" })])).toEqual([]);
  });

  it("counts active listings per district and takes the lowest price", () => {
    const tiles = getDistrictTiles([
      makeListing({ district: District.HaiChau, price: 500 }),
      makeListing({ district: District.HaiChau, price: 300 }),
      makeListing({ district: District.SonTra, price: 900 }),
    ]);
    expect(tiles).toEqual([
      { slug: District.HaiChau, name: "Hải Châu", count: 2, from: 300 },
      { slug: District.SonTra, name: "Sơn Trà", count: 1, from: 900 },
    ]);
  });

  it("excludes drafts from both the count and the 'from' price", () => {
    const [tile] = getDistrictTiles([
      makeListing({ district: District.HaiChau, price: 500 }),
      makeListing({ district: District.HaiChau, price: 100, status: "draft" }),
    ]);
    expect(tile.count).toBe(1);
    expect(tile.from).toBe(500);
  });

  it("ranks by count, breaking ties on the district name", () => {
    const tiles = getDistrictTiles([
      makeListing({ district: District.SonTra }),
      makeListing({ district: District.HaiChau }),
    ]);
    // Equal counts — "Hải Châu" sorts before "Sơn Trà".
    expect(tiles.map((t) => t.slug)).toEqual([District.HaiChau, District.SonTra]);
  });
});

describe("getNewest", () => {
  // getActiveListings returns oldest-first, so the tail is newest.
  const oldestFirst = [
    makeListing({ id: "1" }),
    makeListing({ id: "2" }),
    makeListing({ id: "3" }),
    makeListing({ id: "4" }),
    makeListing({ id: "5" }),
  ];

  it("takes the tail and reverses it, newest first", () => {
    expect(getNewest(oldestFirst, 3).map((l) => l.id)).toEqual(["5", "4", "3"]);
  });

  it("defaults to a full showcase row", () => {
    const plenty = Array.from({ length: SHOWCASE_SIZE + 2 }, (_, i) =>
      makeListing({ id: String(i + 1) })
    );
    expect(getNewest(plenty)).toHaveLength(SHOWCASE_SIZE);
  });

  it("returns everything when there are fewer than the limit", () => {
    expect(getNewest(oldestFirst.slice(0, 2), 4).map((l) => l.id)).toEqual(["2", "1"]);
  });

  it("skips drafts", () => {
    const withDraft = [...oldestFirst, makeListing({ id: "draft", status: "draft" })];
    expect(getNewest(withDraft, 2).map((l) => l.id)).toEqual(["5", "4"]);
  });

  it("handles an empty list", () => {
    expect(getNewest([], 4)).toEqual([]);
  });
});

describe("getTrending", () => {
  const listings = [
    makeListing({ id: "a", views: 10 }),
    makeListing({ id: "b", views: 90 }),
    makeListing({ id: "c", views: 50 }),
    makeListing({ id: "d", views: 999, status: "draft" }),
  ];

  it("orders by views, most-watched first", () => {
    expect(getTrending(listings).map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("never surfaces a draft, however many views it has", () => {
    expect(getTrending(listings).map((l) => l.id)).not.toContain("d");
  });

  it("respects the limit", () => {
    expect(getTrending(listings, 2).map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("keeps the row disjoint from an excluded set", () => {
    // So a home shown under "newest" doesn't appear again under "trending".
    expect(getTrending(listings, 4, new Set(["b"])).map((l) => l.id)).toEqual(["c", "a"]);
  });

  it("does not mutate the input order", () => {
    const input = [...listings];
    getTrending(input);
    expect(input.map((l) => l.id)).toEqual(["a", "b", "c", "d"]);
  });
});
