import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  manageProfileSchema,
  profileSchema,
  roleSchema,
} from "@/schemas/profile";

describe("roleSchema", () => {
  it("accepts the two roles and nothing else", () => {
    expect(roleSchema.safeParse("renter").success).toBe(true);
    expect(roleSchema.safeParse("owner").success).toBe(true);
    expect(roleSchema.safeParse("admin").success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts the default profile", () => {
    expect(profileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
  });

  it("rejects a profile with an unknown role", () => {
    expect(profileSchema.safeParse({ ...DEFAULT_PROFILE, role: "admin" }).success).toBe(false);
  });
});

describe("manageProfileSchema", () => {
  const valid = { name: "Test Renter", email: "renter@example.com", bio: "", palette: 1 };

  it("accepts a filled-in form", () => {
    expect(manageProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty email — the field is optional in practice", () => {
    // The refine short-circuits on a falsy value; only a *malformed* address fails.
    expect(manageProfileSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(manageProfileSchema.safeParse({ ...valid, email: "   " }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    for (const email of ["nope", "a@b", "a b@example.com", "@example.com"]) {
      expect(manageProfileSchema.safeParse({ ...valid, email }).success).toBe(false);
    }
  });

  it("trims the name and email before validating", () => {
    const result = manageProfileSchema.safeParse({
      ...valid,
      name: "  Test Renter  ",
      email: "  renter@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Renter");
      expect(result.data.email).toBe("renter@example.com");
    }
  });

  it("requires a name of at least two characters", () => {
    expect(manageProfileSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
    expect(manageProfileSchema.safeParse({ ...valid, name: "  A  " }).success).toBe(false);
  });
});
