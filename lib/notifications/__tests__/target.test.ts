import { describe, expect, it } from "vitest";
import { NOTIFICATION_KINDS, type NotificationItem } from "@/schemas/notification";
import { notificationHref } from "../target";

const VIEWER = "11111111-1111-1111-1111-111111111111";
const ACTOR = "22222222-2222-2222-2222-222222222222";

function makeItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    kind: "tour_confirmed",
    actor: { id: ACTOR, name: "Maya", palette: 1 },
    listingId: "listing-1",
    tourId: "tour-1",
    savedSearchId: null,
    data: {},
    read: false,
    createdAt: "2026-08-04T00:00:00.000Z",
    listing: null,
    tourRole: "renter",
    ...overrides,
  };
}

describe("notificationHref", () => {
  it("sends a tour notification to the surface for the recipient's side", () => {
    // The same kind lands on different pages depending on who received it,
    // which is why the role is read from the joined tour rather than the kind.
    expect(notificationHref(makeItem({ tourRole: "renter" }), VIEWER)).toBe(
      "/tour"
    );
    expect(notificationHref(makeItem({ tourRole: "owner" }), VIEWER)).toBe(
      "/owner/dashboard/tours"
    );
  });

  it("routes a decline by side too, since either party can send one", () => {
    const declined = { kind: "tour_declined" } as const;
    expect(
      notificationHref(makeItem({ ...declined, tourRole: "owner" }), VIEWER)
    ).toBe("/owner/dashboard/tours");
    expect(
      notificationHref(makeItem({ ...declined, tourRole: "renter" }), VIEWER)
    ).toBe("/tour");
  });

  it("sends a review to the recipient's own profile, not the reviewer's", () => {
    const href = notificationHref(
      makeItem({ kind: "review_received", tourRole: null }),
      VIEWER
    );
    expect(href).toBe(`/owner/${VIEWER}`);
    expect(href).not.toContain(ACTOR);
  });

  it("sends a saved-search match to the home", () => {
    expect(
      notificationHref(
        makeItem({
          kind: "saved_search_match",
          actor: null,
          tourId: null,
          tourRole: null,
        }),
        VIEWER
      )
    ).toBe("/apartments/listing-1");
  });

  it("falls back rather than linking nowhere when the subject is gone", () => {
    // RLS hides a home the owner has since unpublished, so listingId can be
    // null on a row that used to point at one.
    expect(
      notificationHref(
        makeItem({ kind: "saved_search_match", listingId: null }),
        VIEWER
      )
    ).toBe("/apartments");
    expect(
      notificationHref(makeItem({ kind: "review_received" }), undefined)
    ).toBe("/owner/dashboard");
  });

  it("resolves a non-empty href for every kind", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(notificationHref(makeItem({ kind }), VIEWER)).toMatch(/^\//);
    }
  });
});
