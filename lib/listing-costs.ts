import {
  UTILITY_IDS,
  type ListingCosts,
  type UtilityId,
} from "@/schemas/listing";

/* Pure cost-transparency logic (improvement #13) — no React, shared by the
   renter display components, the browse card, and the owner form's live
   preview. All amounts are USD, matching `Listing.price`; callers format
   with useMoney(). The cardinal rule: an absent value is "not listed" and
   must never be presented as free or zero. */

/** What a listing quotes for one utility, normalized for display. A "fixed"
    mode without an amount reads as metered — the owner picked "Fixed" but
    never said how much, and a bare "Fixed" answers nothing. */
export type UtilityQuote =
  | { kind: "included" }
  | { kind: "metered" }
  | { kind: "fixed"; amount: number };

export function utilityQuote(
  costs: ListingCosts | undefined,
  id: UtilityId
): UtilityQuote | null {
  const mode = costs?.util[id];
  if (!mode || !costs) return null;
  if (mode === "fixed") {
    const amount = costs.amt[id] ?? 0;
    return amount > 0 ? { kind: "fixed", amount } : { kind: "metered" };
  }
  return { kind: mode };
}

/** Cash value of the deposit in USD, or null when unknown. */
export function depositCash(
  price: number,
  costs: ListingCosts | undefined
): number | null {
  switch (costs?.deposit) {
    case "none":
      return 0;
    case "1mo":
      return price;
    case "2mo":
      return price * 2;
    case "custom":
      return costs.depositAmount && costs.depositAmount > 0
        ? costs.depositAmount
        : null;
    default:
      return null;
  }
}

export type MoveInEstimate = {
  total: number;
  first: number;
  deposit: number;
  noDeposit: boolean;
};

/** The number renters budget against: first month + deposit. Null when the
    deposit is unknown — no deposit info means no honest estimate. */
export function moveInEstimate(
  price: number,
  costs: ListingCosts | undefined
): MoveInEstimate | null {
  const deposit = depositCash(price, costs);
  if (deposit == null) return null;
  return { total: price + deposit, first: price, deposit, noDeposit: deposit === 0 };
}

/* A utility counts as answered only when its answer is complete — "fixed"
   needs the amount to mean anything. */
const utilityAnswered = (costs: ListingCosts, id: UtilityId): boolean => {
  const mode = costs.util[id];
  if (!mode) return false;
  if (mode === "fixed") return (costs.amt[id] ?? 0) > 0;
  return true;
};

/** Whether the listing has any cost info at all — the renter costs section
    renders nothing without it (no empty shell). */
export function hasAnyCost(costs: ListingCosts | undefined): boolean {
  if (!costs) return false;
  return (
    costs.deposit !== undefined ||
    costs.minLease !== undefined ||
    UTILITY_IDS.some((id) => costs.util[id] !== undefined)
  );
}

/** Every money question answered — earns the quiet "transparent pricing"
    note. Deliberately strict: a custom deposit or fixed utility without an
    amount doesn't count. */
export function isTransparent(costs: ListingCosts | undefined): boolean {
  if (!costs) return false;
  const depositOk =
    costs.deposit !== undefined &&
    (costs.deposit !== "custom" ||
      (costs.depositAmount != null && costs.depositAmount > 0));
  const leaseOk = costs.minLease != null && costs.minLease >= 0;
  return depositOk && leaseOk && UTILITY_IDS.every((id) => utilityAnswered(costs, id));
}
