import { describe, expect, it } from "vitest";
import { OwnerSchema } from "@/schemas/owner";
import { makeOwner } from "@/tests/factories";

describe("OwnerSchema", () => {
  it("accepts a complete owner", () => {
    expect(OwnerSchema.safeParse(makeOwner()).success).toBe(true);
  });

  it("rejects an owner missing a required field", () => {
    const withoutName: Record<string, unknown> = { ...makeOwner() };
    delete withoutName.name;
    expect(OwnerSchema.safeParse(withoutName).success).toBe(false);
  });

  it("requires languages to be a list of strings", () => {
    expect(OwnerSchema.safeParse({ ...makeOwner(), languages: "English" }).success).toBe(
      false
    );
  });
});
