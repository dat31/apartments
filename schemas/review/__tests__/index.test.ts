import { describe, expect, it } from "vitest";
import { ReviewSchema, createReviewFormSchema } from "@/schemas/review";
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
  const valid = { rating: 5, author: "Priya Nair", text: "Great place to stay." };

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

  it("requires an author", () => {
    expect(schema.safeParse({ ...valid, author: "" }).success).toBe(false);
  });
});
