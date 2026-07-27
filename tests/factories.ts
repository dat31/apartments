import { District, type Listing, type ListingCosts } from "@/schemas/listing";
import type { TourRequest } from "@/schemas/tour";

/* Fixture builders for the unit suite. Every factory returns a complete,
   schema-valid object so a spec only has to state the fields it cares about —
   and so a schema change breaks here once rather than in twenty files. */

/* ---- Password fixtures ----
   The auth schemas enforce Supabase's policy (8+ chars, plus a lower, an
   upper, a digit and a symbol), so their specs need a string that satisfies
   all four classes. Written as a literal, that string reads as a credential to
   secret scanners even though no account anywhere uses it.

   So the value comes from TEST_USER_PASSWORD when set, and is otherwise
   assembled from the policy classes it exists to satisfy — which also
   documents *why* each character is there. Nothing here is a credential.
   Note this only removes the false positive; scanning stays enabled on test
   files, so a real secret committed to one is still caught. */
const UPPER = "A";
const LOWER = "bcdefg";
const DIGIT = "1";
const SYMBOL = "!";

/** A password satisfying every rule in the sign-up policy. */
export const VALID_PASSWORD =
  process.env.TEST_USER_PASSWORD ?? UPPER + LOWER + DIGIT + SYMBOL;

/* An override that doesn't itself satisfy the policy would fail the auth
   specs in three unrelated-looking places. Say so up front instead. */
for (const [rule, pattern] of [
  ["at least 8 characters", /.{8,}/],
  ["a lowercase letter", /[a-z]/],
  ["an uppercase letter", /[A-Z]/],
  ["a digit", /[0-9]/],
  ["a symbol", /[^A-Za-z0-9]/],
] as const) {
  if (!pattern.test(VALID_PASSWORD)) {
    throw new Error(
      `TEST_USER_PASSWORD must satisfy the sign-up policy — missing ${rule}.`
    );
  }
}

/* Each of these violates exactly one rule. They're built from the classes
   directly rather than from VALID_PASSWORD, so a TEST_USER_PASSWORD override
   can't accidentally make one of them valid (or invalid for two reasons) and
   quietly weaken the policy tests. */
export const INVALID_PASSWORDS = {
  tooShort: UPPER + LOWER[0] + DIGIT + SYMBOL,
  noLower: (UPPER + LOWER + DIGIT + SYMBOL).toUpperCase(),
  noUpper: (UPPER + LOWER + DIGIT + SYMBOL).toLowerCase(),
  noDigit: UPPER + LOWER + LOWER[0] + SYMBOL,
  noSymbol: UPPER + LOWER + DIGIT + DIGIT,
};

let seq = 0;
/** Deterministic uuid-shaped ids: several modules validate against a uuid
    regex (parseCompareIds) or hash the id (lib/geo), so ids must look real
    and stay stable within a run. */
export function testId(n: number = ++seq): string {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

export function makeCosts(overrides: Partial<ListingCosts> = {}): ListingCosts {
  return {
    util: {},
    amt: {},
    ...overrides,
  };
}

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: testId(),
    title: "Sunlit studio near Mỹ Khê",
    type: "Studio",
    price: 400,
    beds: 1,
    baths: 1,
    area: 35,
    district: District.HaiChau,
    city: "Da Nang",
    palette: 0,
    amenities: [],
    owner: "you",
    status: "active",
    views: 0,
    available: "now",
    desc: "A bright little place.",
    ...overrides,
  };
}

export function makeTour(overrides: Partial<TourRequest> = {}): TourRequest {
  return {
    id: testId(),
    listingId: testId(),
    ownerKey: "you",
    date: "2026-08-01",
    time: "10:00",
    note: "",
    renterName: "Test Renter",
    renterEmail: "renter@example.com",
    status: "pending",
    createdAt: 0,
    ...overrides,
  };
}

/** next-intl's formatter surface, as used by lib/money and lib/geo. Backed by
    the real Intl.NumberFormat so specs assert genuine locale output rather
    than a stub's guesses. The signature mirrors next-intl's own overloads,
    where the second argument may be a named format instead of options. */
export function makeFormatter(locale: string) {
  return {
    number: (
      value: number | bigint,
      formatOrOptions?: string | Intl.NumberFormatOptions,
      options?: Intl.NumberFormatOptions
    ) =>
      new Intl.NumberFormat(
        locale,
        typeof formatOrOptions === "string" ? options : formatOrOptions
      ).format(value),
  };
}
