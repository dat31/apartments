import { describe, expect, it } from "vitest";
import { acctInitials } from "@/lib/data/profile";

/* Renders inside the account avatar, so it must never come back empty — an
   empty avatar reads as a broken image. */

describe("acctInitials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(acctInitials("Jordan Rivera")).toBe("JR");
    expect(acctInitials("maya okonkwo")).toBe("MO");
  });

  it("ignores words beyond the second", () => {
    expect(acctInitials("Jean Claude Van Damme")).toBe("JC");
  });

  it("handles a single name", () => {
    expect(acctInitials("Cher")).toBe("C");
  });

  it("falls back to a placeholder for an empty or whitespace-only name", () => {
    expect(acctInitials("")).toBe("?");
    expect(acctInitials("   ")).toBe("?");
  });

  it("collapses repeated whitespace", () => {
    expect(acctInitials("Jordan   Rivera")).toBe("JR");
  });

  it("never returns an empty string", () => {
    for (const name of ["", " ", "\t", "a", "a b c"]) {
      expect(acctInitials(name).length).toBeGreaterThan(0);
    }
  });
});
