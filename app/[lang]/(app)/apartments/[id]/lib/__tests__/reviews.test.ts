import { describe, expect, it } from "vitest";
import { REVIEWS_PER_PAGE, reviewPageCount, reviewRange } from "../reviews";

describe("reviewPageCount", () => {
  it("reports one page when there are no reviews", () => {
    // The pager still renders, so zero pages would be a broken state.
    expect(reviewPageCount(0)).toBe(1);
  });

  it("reports one page for a partial first page", () => {
    expect(reviewPageCount(1)).toBe(1);
    expect(reviewPageCount(REVIEWS_PER_PAGE)).toBe(1);
  });

  it("adds a page as soon as one review spills over", () => {
    expect(reviewPageCount(REVIEWS_PER_PAGE + 1)).toBe(2);
  });

  it("divides evenly without an extra empty page", () => {
    expect(reviewPageCount(REVIEWS_PER_PAGE * 3)).toBe(3);
  });
});

describe("reviewRange", () => {
  it("starts the first page at row 0", () => {
    expect(reviewRange(1)).toEqual([0, REVIEWS_PER_PAGE - 1]);
  });

  it("advances by a full page each time", () => {
    expect(reviewRange(2)).toEqual([REVIEWS_PER_PAGE, REVIEWS_PER_PAGE * 2 - 1]);
    expect(reviewRange(3)).toEqual([
      REVIEWS_PER_PAGE * 2,
      REVIEWS_PER_PAGE * 3 - 1,
    ]);
  });

  it("covers every row across its pages, with no gaps or overlaps", () => {
    const total = REVIEWS_PER_PAGE * 3 + 1;
    const seen: number[] = [];
    for (let page = 1; page <= reviewPageCount(total); page++) {
      const [from, to] = reviewRange(page);
      for (let row = from; row <= to; row++) seen.push(row);
    }
    // A short final page over-reaches; the DB just returns fewer rows.
    expect(seen.slice(0, total)).toEqual(
      Array.from({ length: total }, (_, i) => i)
    );
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("clamps a non-positive page to the first row rather than going negative", () => {
    expect(reviewRange(0)).toEqual([0, REVIEWS_PER_PAGE - 1]);
  });
});
