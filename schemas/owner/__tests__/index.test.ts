import { describe, expect, it } from "vitest";
import { OwnerSchema } from "@/schemas/owner";
import { OWNERS } from "@/lib/data/listings";

describe("OwnerSchema", () => {
  it("accepts every seeded owner", () => {
    for (const owner of Object.values(OWNERS)) {
      expect(OwnerSchema.safeParse(owner).success).toBe(true);
    }
  });

  it("rejects an owner missing a required field", () => {
    const withoutName: Record<string, unknown> = { ...OWNERS.you };
    delete withoutName.name;
    expect(OwnerSchema.safeParse(withoutName).success).toBe(false);
  });

  it("requires languages to be a list of strings", () => {
    expect(OwnerSchema.safeParse({ ...OWNERS.you, languages: "English" }).success).toBe(
      false
    );
  });
});
