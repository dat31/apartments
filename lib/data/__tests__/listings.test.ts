import { describe, expect, it } from "vitest";
import {
  availInfo,
  avgOf,
  initialsOf,
  USD_TO_VND,
} from "@/lib/data/listings";
import type { Review } from "@/schemas/review";
import { makeListing, makeReview } from "@/tests/factories";

const NOW = new Date("2026-06-15T09:00:00");

describe("availInfo", () => {
  it("reports 'now' for the literal marker", () => {
    expect(availInfo(makeListing({ available: "now" }), NOW)).toEqual({ kind: "now" });
  });

  it("reports 'now' when the field is empty", () => {
    expect(availInfo(makeListing({ available: "" }), NOW)).toEqual({ kind: "now" });
  });

  it("reports 'now' for a date that has already passed", () => {
    expect(availInfo(makeListing({ available: "2026-01-01" }), NOW)).toEqual({
      kind: "now",
    });
  });

  it("reports 'now' on the availability date itself", () => {
    // The comparison is against midnight, so a listing free today reads as now
    // even though `now` is 09:00.
    expect(availInfo(makeListing({ available: "2026-06-15" }), NOW)).toEqual({
      kind: "now",
    });
  });

  it("returns the date for a future availability", () => {
    const result = availInfo(makeListing({ available: "2026-07-01" }), NOW);
    expect(result.kind).toBe("date");
    if (result.kind === "date") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(result.date.getMonth()).toBe(6); // July, zero-indexed
      expect(result.date.getDate()).toBe(1);
    }
  });

  it("degrades to 'now' rather than throwing on an unparseable date", () => {
    expect(availInfo(makeListing({ available: "not-a-date" }), NOW)).toEqual({
      kind: "now",
    });
  });

  it("does not mutate the caller's reference time", () => {
    const now = new Date("2026-06-15T09:00:00");
    availInfo(makeListing({ available: "2026-07-01" }), now);
    expect(now.getHours()).toBe(9);
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initialsOf("Priya Nair")).toBe("PN");
    expect(initialsOf("maya okonkwo")).toBe("MO");
  });

  it("ignores words beyond the second", () => {
    expect(initialsOf("Jean Claude Van Damme")).toBe("JC");
  });

  it("handles a single name", () => {
    expect(initialsOf("Cher")).toBe("C");
  });

  it("collapses repeated whitespace", () => {
    expect(initialsOf("Priya   Nair")).toBe("PN");
  });
});

describe("avgOf", () => {
  const review = (rating: number): Review => makeReview({ rating });

  it("returns 0 for an empty list rather than NaN", () => {
    // A bare reduce would divide by zero here.
    expect(avgOf([])).toBe(0);
  });

  it("averages the ratings", () => {
    expect(avgOf([review(5), review(4)])).toBe(4.5);
    expect(avgOf([review(5)])).toBe(5);
  });
});

describe("USD_TO_VND", () => {
  it("is a positive rate, so converted prices keep their ordering", () => {
    expect(USD_TO_VND).toBeGreaterThan(0);
  });
});
