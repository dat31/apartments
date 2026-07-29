import { describe, expect, it } from "vitest";
import {
  ReviewInputSchema,
  ReviewSchema,
  createReviewFormSchema,
} from "@/schemas/review";
import { SEED_REVIEWS } from "@/lib/data/listings";

/** Schemas are factories taking a translator; an identity stub keeps the
    assertions about message keys rather than Vietnamese copy. */
const t = (key: string) => key;

describe("ReviewSchema", () => {
  it("accepts every seeded review", () => {
    for (const review of SEED_REVIEWS) {
      expect(ReviewSchema.safeParse(review).success).toBe(true);
    }
  });

  it("treats the stay reference as optional", () => {
    const withoutStay: Record<string, unknown> = { ...SEED_REVIEWS[0] };
    delete withoutStay.stay;
    expect(ReviewSchema.safeParse(withoutStay).success).toBe(true);
  });

  it("rejects a non-numeric rating", () => {
    expect(ReviewSchema.safeParse({ ...SEED_REVIEWS[0], rating: "5" }).success).toBe(false);
  });
});

describe("createReviewFormSchema", () => {
  const schema = createReviewFormSchema(t);
  const valid = { rating: 5, text: "Great place to stay." };

  it("accepts a filled-in review", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("requires a rating to have been picked", () => {
    expect(schema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
  });

  it("requires review text long enough to say something", () => {
    expect(schema.safeParse({ ...valid, text: "ok" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, text: "good" }).success).toBe(true);
  });

  /* The writer is identified by author_id server-side (RLS
     `reviews_insert_author`), so the form never collects a name. */
  it("collects no author name", () => {
    const parsed = schema.parse({ ...valid, author: "Priya Nair" });
    expect(parsed).not.toHaveProperty("author");
  });
});

describe("ReviewInputSchema", () => {
  const valid = {
    ownerId: "maya",
    rating: 5,
    text: "Great place to stay.",
  };

  it("accepts a seed owner key and a real listing reference", () => {
    expect(ReviewInputSchema.safeParse(valid).success).toBe(true);
    expect(
      ReviewInputSchema.safeParse({
        ...valid,
        listingId: "11111111-1111-1111-1111-111111111111",
      }).success
    ).toBe(true);
  });

  it("keeps the rating within 1–5 and whole", () => {
    for (const rating of [0, 6, 4.5]) {
      expect(ReviewInputSchema.safeParse({ ...valid, rating }).success).toBe(
        false
      );
    }
  });

  it("rejects a listing reference that isn't a uuid", () => {
    expect(
      ReviewInputSchema.safeParse({ ...valid, listingId: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects text that is too short or unbounded", () => {
    expect(ReviewInputSchema.safeParse({ ...valid, text: "ok" }).success).toBe(
      false
    );
    expect(
      ReviewInputSchema.safeParse({ ...valid, text: "x".repeat(2001) }).success
    ).toBe(false);
  });
});
