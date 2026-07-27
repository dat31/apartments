import { describe, expect, it } from "vitest";
import {
  depositCash,
  hasAnyCost,
  isTransparent,
  moveInEstimate,
  utilityQuote,
} from "@/lib/listing-costs";
import { makeCosts } from "@/tests/factories";

/* The module's cardinal rule: an absent value is "not listed" and must never
   be presented as free or zero. Most of these cases exist to pin that
   distinction — 0 and null mean very different things to a renter. */

describe("utilityQuote", () => {
  it("returns null when the listing has no costs at all", () => {
    expect(utilityQuote(undefined, "water")).toBeNull();
  });

  it("returns null for a utility the owner never answered", () => {
    expect(utilityQuote(makeCosts({ util: { water: "included" } }), "wifi")).toBeNull();
  });

  it("passes through included and metered", () => {
    const costs = makeCosts({ util: { water: "included", wifi: "metered" } });
    expect(utilityQuote(costs, "water")).toEqual({ kind: "included" });
    expect(utilityQuote(costs, "wifi")).toEqual({ kind: "metered" });
  });

  it("reports a fixed quote with its amount", () => {
    const costs = makeCosts({ util: { wifi: "fixed" }, amt: { wifi: 12 } });
    expect(utilityQuote(costs, "wifi")).toEqual({ kind: "fixed", amount: 12 });
  });

  it("downgrades fixed-without-amount to metered", () => {
    // A bare "Fixed" answers nothing, so it must not read as a priced quote.
    expect(utilityQuote(makeCosts({ util: { wifi: "fixed" } }), "wifi")).toEqual({
      kind: "metered",
    });
    expect(
      utilityQuote(makeCosts({ util: { wifi: "fixed" }, amt: { wifi: 0 } }), "wifi")
    ).toEqual({ kind: "metered" });
  });
});

describe("depositCash", () => {
  it("distinguishes an explicit zero deposit from an unknown one", () => {
    expect(depositCash(500, makeCosts({ deposit: "none" }))).toBe(0);
    expect(depositCash(500, makeCosts())).toBeNull();
    expect(depositCash(500, undefined)).toBeNull();
  });

  it("multiplies the rent for the month-based deposits", () => {
    expect(depositCash(500, makeCosts({ deposit: "1mo" }))).toBe(500);
    expect(depositCash(500, makeCosts({ deposit: "2mo" }))).toBe(1000);
  });

  it("uses the custom amount only when it is a positive number", () => {
    expect(
      depositCash(500, makeCosts({ deposit: "custom", depositAmount: 750 }))
    ).toBe(750);
    expect(depositCash(500, makeCosts({ deposit: "custom" }))).toBeNull();
    expect(
      depositCash(500, makeCosts({ deposit: "custom", depositAmount: 0 }))
    ).toBeNull();
  });
});

describe("moveInEstimate", () => {
  it("refuses to estimate when the deposit is unknown", () => {
    expect(moveInEstimate(500, makeCosts())).toBeNull();
    expect(moveInEstimate(500, undefined)).toBeNull();
  });

  it("sums first month and deposit", () => {
    expect(moveInEstimate(500, makeCosts({ deposit: "2mo" }))).toEqual({
      total: 1500,
      first: 500,
      deposit: 1000,
      noDeposit: false,
    });
  });

  it("flags a genuinely deposit-free listing", () => {
    expect(moveInEstimate(500, makeCosts({ deposit: "none" }))).toEqual({
      total: 500,
      first: 500,
      deposit: 0,
      noDeposit: true,
    });
  });
});

describe("hasAnyCost", () => {
  it("is false without costs or with an entirely blank costs object", () => {
    expect(hasAnyCost(undefined)).toBe(false);
    expect(hasAnyCost(makeCosts())).toBe(false);
  });

  it("is true as soon as any single question is answered", () => {
    expect(hasAnyCost(makeCosts({ deposit: "none" }))).toBe(true);
    expect(hasAnyCost(makeCosts({ minLease: 0 }))).toBe(true);
    expect(hasAnyCost(makeCosts({ util: { water: "metered" } }))).toBe(true);
  });
});

describe("isTransparent", () => {
  const complete = makeCosts({
    deposit: "1mo",
    minLease: 6,
    util: {
      electricity: "metered",
      water: "included",
      wifi: "fixed",
      building: "included",
    },
    amt: { wifi: 10 },
  });

  it("accepts a listing with every money question answered", () => {
    expect(isTransparent(complete)).toBe(true);
  });

  it("accepts an explicit zero minimum lease", () => {
    // 0 months is an answer; the check is `>= 0`, not truthiness.
    expect(isTransparent({ ...complete, minLease: 0 })).toBe(true);
  });

  it("rejects a custom deposit with no amount", () => {
    expect(
      isTransparent({ ...complete, deposit: "custom", depositAmount: undefined })
    ).toBe(false);
  });

  it("rejects a fixed utility with no amount", () => {
    expect(isTransparent({ ...complete, amt: {} })).toBe(false);
  });

  it("rejects when any single utility is unanswered", () => {
    expect(
      isTransparent({
        ...complete,
        util: { ...complete.util, building: undefined },
      })
    ).toBe(false);
  });

  it("rejects a missing lease term or missing costs", () => {
    expect(isTransparent({ ...complete, minLease: undefined })).toBe(false);
    expect(isTransparent(undefined)).toBe(false);
  });
});
