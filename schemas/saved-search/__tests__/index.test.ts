import { describe, expect, it } from "vitest";
import {
  createSaveSearchSchema,
  savedSearchSchema,
  SAVED_SEARCH_MAX,
} from "@/schemas/saved-search";

/** Schemas are factories taking a translator; an identity stub keeps the
    assertions about message keys rather than Vietnamese copy. */
const t = (key: string) => key;

describe("savedSearchSchema", () => {
  const valid = {
    id: "s1",
    name: "Houses in Hải Châu",
    queryString: "type=House&district=hai-chau",
    alerts: true,
    createdAt: "2026-06-15T00:00:00Z",
  };

  it("accepts a saved search", () => {
    expect(savedSearchSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty query string — a saved 'everything' search", () => {
    expect(savedSearchSchema.safeParse({ ...valid, queryString: "" }).success).toBe(true);
  });

  it("requires alerts to be a boolean, not a truthy string", () => {
    expect(savedSearchSchema.safeParse({ ...valid, alerts: "yes" }).success).toBe(false);
  });

  it("caps saved searches at a number the alert loop can afford", () => {
    // Mirrored by the enforce_saved_search_cap DB trigger.
    expect(SAVED_SEARCH_MAX).toBeGreaterThan(0);
    expect(SAVED_SEARCH_MAX).toBeLessThanOrEqual(50);
  });
});

describe("createSaveSearchSchema", () => {
  const schema = createSaveSearchSchema(t);

  it("accepts a name", () => {
    expect(schema.safeParse({ name: "Beach houses" }).success).toBe(true);
  });

  it("rejects a blank or whitespace-only name", () => {
    expect(schema.safeParse({ name: "" }).success).toBe(false);
    expect(schema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("trims before validating", () => {
    const result = schema.safeParse({ name: "  Beach houses  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Beach houses");
  });

  it("rejects a name too long for the card", () => {
    expect(schema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
    expect(schema.safeParse({ name: "x".repeat(80) }).success).toBe(true);
  });
});
