import { describe, expect, it } from "vitest";
import { REVIEWS_PER_PAGE, reviewPageCount, reviewsForPage } from "../reviews";
import type { Review } from "@/schemas/review";

const reviews = (n: number): Review[] =>
  Array.from(
    { length: n },
    (_, i) =>
      ({
        id: `r${i}`,
        owner: "you",
        author: `Author ${i}`,
        initials: "AA",
        rating: 5,
        date: "2026-01",
        stay: "A home",
        text: "Good.",
      }) as Review
  );

describe("reviewPageCount", () => {
  it("reports one page when there are no reviews", () => {
    // The pager still renders, so zero pages would be a broken state.
    expect(reviewPageCount([])).toBe(1);
  });

  it("reports one page for a partial first page", () => {
    expect(reviewPageCount(reviews(1))).toBe(1);
    expect(reviewPageCount(reviews(REVIEWS_PER_PAGE))).toBe(1);
  });

  it("adds a page as soon as one review spills over", () => {
    expect(reviewPageCount(reviews(REVIEWS_PER_PAGE + 1))).toBe(2);
  });

  it("divides evenly without an extra empty page", () => {
    expect(reviewPageCount(reviews(REVIEWS_PER_PAGE * 3))).toBe(3);
  });
});

describe("reviewsForPage", () => {
  const all = reviews(REVIEWS_PER_PAGE * 2 + 1);

  it("returns the first page's slice", () => {
    expect(reviewsForPage(all, 1).map((r) => r.id)).toEqual(
      all.slice(0, REVIEWS_PER_PAGE).map((r) => r.id)
    );
  });

  it("returns the second page's slice", () => {
    expect(reviewsForPage(all, 2).map((r) => r.id)).toEqual(
      all.slice(REVIEWS_PER_PAGE, REVIEWS_PER_PAGE * 2).map((r) => r.id)
    );
  });

  it("returns the short final page", () => {
    expect(reviewsForPage(all, 3)).toHaveLength(1);
  });

  it("returns nothing past the last page rather than throwing", () => {
    expect(reviewsForPage(all, 99)).toEqual([]);
  });

  it("returns nothing for an empty list", () => {
    expect(reviewsForPage([], 1)).toEqual([]);
  });

  it("covers every review across its pages, with no gaps or repeats", () => {
    const seen = Array.from({ length: reviewPageCount(all) }, (_, i) =>
      reviewsForPage(all, i + 1)
    ).flat();
    expect(seen.map((r) => r.id)).toEqual(all.map((r) => r.id));
  });
});
