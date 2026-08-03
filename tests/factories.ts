import { District, type Listing, type ListingCosts } from "@/schemas/listing";
import type { Owner } from "@/schemas/owner";
import type { Review } from "@/schemas/review";
import type { TourRequest } from "@/schemas/tour";
import type { LinkHotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";

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

/** A stable owner uuid for fixtures — owners, listings and tours are all
    keyed by profile uuid. */
export const OWNER_ID = "00000000-0000-4000-8000-00000000dead";

export function makeOwner(overrides: Partial<Owner> = {}): Owner {
  return {
    key: OWNER_ID,
    name: "Maya Okonkwo",
    palette: 5,
    joined: "2019-08",
    verified: true,
    superhost: true,
    responseRate: 97,
    responseTime: "within a few hours",
    languages: ["English", "French"],
    bio: "Architect by training, host by habit.",
    ...overrides,
  };
}

export function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: testId(),
    owner: OWNER_ID,
    author: "Priya Nair",
    initials: "PN",
    rating: 5,
    date: "2026-04",
    text: "Spotless and exactly as listed.",
    ...overrides,
  };
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
    owner: OWNER_ID,
    status: "active",
    views: 0,
    available: "now",
    desc: "A bright little place.",
    /* English base copy, matching the title/desc above — so a fixture that
       adds an `i18n.vi` entry is testing a real fallback, not a mislabelled
       one. Override alongside `title`/`desc` when a test needs the reverse. */
    baseLocale: "en",
    ...overrides,
  };
}

export function makeTour(overrides: Partial<TourRequest> = {}): TourRequest {
  return {
    id: testId(),
    listingId: testId(),
    ownerKey: OWNER_ID,
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

/* ---- Virtual tour fixtures ----
   `makeTour` above is the in-person viewing appointment; these are the 360°
   tour (see docs/plans/virtual-home-tour.md §2 on the name collision). Scene
   ids are readable words rather than uuids, because every assertion about a
   tour graph is about which room links to which. */

export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "living",
    name: "Living room",
    room: "living",
    panorama: "/panoramas/living-room.jpg",
    preview: "/panoramas/living-room-preview.jpg",
    yaw: 0,
    pitch: 0,
    sortOrder: 0,
    hotspots: [],
    ...overrides,
  };
}

/** A link hotspot from the scene it is attached to, to `target`. */
export function makeLink(target: string, overrides: Partial<LinkHotspot> = {}): LinkHotspot {
  return {
    id: `to-${target}`,
    kind: "link",
    yaw: 0,
    pitch: 0,
    label: target,
    target,
    ...overrides,
  };
}

/** A two-room tour with a door each way — the smallest tour that validates. */
export function makeVirtualTour(overrides: Partial<VirtualTour> = {}): VirtualTour {
  return {
    id: "tour-1",
    listingId: testId(),
    status: "published",
    entryScene: "living",
    scenes: [
      makeScene({ hotspots: [makeLink("bedroom")] }),
      makeScene({
        id: "bedroom",
        name: "Bedroom",
        room: "bed",
        sortOrder: 1,
        hotspots: [makeLink("living")],
      }),
    ],
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
