import { describe, expect, it } from "vitest";
import { coordsOf, districtCenter, formatDistance, kmBetween } from "@/lib/geo";
import { District } from "@/schemas/listing";
import { makeFormatter, makeListing } from "@/tests/factories";

describe("districtCenter", () => {
  it("returns a plausible Da Nang coordinate for every known district", () => {
    for (const d of Object.values(District)) {
      const [lat, lng] = districtCenter(d);
      expect(lat).toBeGreaterThan(15.9);
      expect(lat).toBeLessThan(16.2);
      expect(lng).toBeGreaterThan(108.0);
      expect(lng).toBeLessThan(108.4);
    }
  });

  it("falls back to the city centre for an unknown district", () => {
    expect(districtCenter("atlantis")).toEqual(districtCenter(District.HaiChau));
  });
});

describe("coordsOf", () => {
  it("prefers the owner-set pin when one is stored", () => {
    const listing = makeListing({ lat: 16.1234, lng: 108.5678 });
    expect(coordsOf(listing)).toEqual([16.1234, 108.5678]);
  });

  it("uses the pin even at the origin-adjacent value 0", () => {
    // A truthiness check would drop a legitimate 0 here.
    expect(coordsOf(makeListing({ lat: 0, lng: 0 }))).toEqual([0, 0]);
  });

  it("synthesizes coordinates when only one half of the pin is stored", () => {
    const half = makeListing({ id: "abc", district: District.SonTra, lat: 16.1 });
    expect(coordsOf(half)).toEqual(coordsOf({ ...half, lat: undefined }));
  });

  it("is deterministic — the same listing always lands on the same point", () => {
    const listing = makeListing({ id: "stable-id", district: District.CamLe });
    expect(coordsOf(listing)).toEqual(coordsOf(listing));
  });

  it("spreads same-district listings apart instead of stacking them", () => {
    const a = coordsOf(makeListing({ id: "listing-a", district: District.CamLe }));
    const b = coordsOf(makeListing({ id: "listing-b", district: District.CamLe }));
    expect(a).not.toEqual(b);
  });

  it("keeps the synthesized point near its district centre", () => {
    const centre = districtCenter(District.NguHanhSon);
    const [lat, lng] = coordsOf(
      makeListing({ id: "somewhere", district: District.NguHanhSon })
    );
    // The offset is ±0.006° — roughly ±650 m.
    expect(Math.abs(lat - centre[0])).toBeLessThanOrEqual(0.006);
    expect(Math.abs(lng - centre[1])).toBeLessThanOrEqual(0.006);
  });
});

describe("kmBetween", () => {
  it("is zero for a point and itself", () => {
    expect(kmBetween([16.0605, 108.2242], [16.0605, 108.2242])).toBe(0);
  });

  it("is symmetric", () => {
    const a: [number, number] = [16.047, 108.22];
    const b: [number, number] = [16.067, 108.2415];
    expect(kmBetween(a, b)).toBeCloseTo(kmBetween(b, a), 10);
  });

  it("matches a known distance", () => {
    // One degree of latitude is ~111.19 km on a sphere of radius 6371 km.
    expect(kmBetween([16, 108], [17, 108])).toBeCloseTo(111.19, 1);
  });

  it("shortens a degree of longitude away from the equator", () => {
    const atEquator = kmBetween([0, 108], [0, 109]);
    const atDaNang = kmBetween([16, 108], [16, 109]);
    expect(atDaNang).toBeLessThan(atEquator);
  });

  it("gives a sane intra-city distance between two districts", () => {
    const km = kmBetween(districtCenter(District.LienChieu), districtCenter(District.NguHanhSon));
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(20);
  });
});

describe("formatDistance", () => {
  const format = makeFormatter("en");

  it("uses metres below one kilometre", () => {
    expect(formatDistance(format, 0.4)).toContain("400");
    expect(formatDistance(format, 0.4)).toMatch(/m/);
  });

  it("rounds metres to whole numbers", () => {
    expect(formatDistance(format, 0.4567)).toContain("457");
  });

  it("uses one decimal between one and ten kilometres", () => {
    expect(formatDistance(format, 3.45)).toMatch(/3\.[45]/);
  });

  it("drops the decimal at ten kilometres and above", () => {
    const label = formatDistance(format, 12.6);
    expect(label).toMatch(/13/);
    expect(label).not.toMatch(/\./);
  });

  it("switches units exactly at the one-kilometre boundary", () => {
    expect(formatDistance(format, 0.999)).toMatch(/m/);
    expect(formatDistance(format, 1)).toMatch(/km/);
  });

  it("respects the caller's locale", () => {
    // vi uses a comma as the decimal separator.
    expect(formatDistance(makeFormatter("vi"), 3.5)).toContain("3,5");
  });
});
