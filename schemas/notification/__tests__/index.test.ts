import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/database.types";
import {
  NOTIFICATION_KINDS,
  notificationDataSchema,
  notificationIdSchema,
  notificationKindSchema,
} from "../index";

describe("notification kinds", () => {
  it("matches the notification_kind Postgres enum exactly", () => {
    /* The one assertion in this file that earns its keep. A kind added to the
       migration but not here is a row the feed refuses to map; added here but
       not to the migration, it is an insert Postgres rejects. Comparing
       against the generated Constants means the drift is caught by
       regenerating types, not in production. */
    expect([...NOTIFICATION_KINDS]).toEqual([
      ...Constants.public.Enums.notification_kind,
    ]);
  });

  it("rejects a kind the database does not have", () => {
    expect(notificationKindSchema.safeParse("tour_confirmed").success).toBe(true);
    expect(notificationKindSchema.safeParse("message_received").success).toBe(
      false
    );
  });
});

describe("notificationDataSchema", () => {
  it("accepts an empty payload", () => {
    // Which fields a payload carries is decided by the kind, so every one of
    // them has to be optional — a review has a rating and no slot.
    expect(notificationDataSchema.parse({})).toEqual({});
  });

  it("keeps the fields the sentence renders", () => {
    expect(
      notificationDataSchema.parse({ date: "2026-08-12", time: "14:00:00" })
    ).toEqual({ date: "2026-08-12", time: "14:00:00" });
    expect(notificationDataSchema.parse({ rating: 5 })).toEqual({ rating: 5 });
  });

  it("rejects a payload whose types are wrong", () => {
    expect(notificationDataSchema.safeParse({ rating: "five" }).success).toBe(
      false
    );
  });
});

describe("notificationIdSchema", () => {
  it("only accepts a uuid", () => {
    expect(
      notificationIdSchema.safeParse("6f1c9b6e-3f5a-4a5e-9d0e-2b7c1a4f8e21")
        .success
    ).toBe(true);
    // A Server Action is a public endpoint; the id arriving from a client is
    // untrusted input, not a value the page that rendered the button vouches for.
    expect(notificationIdSchema.safeParse("1 or 1=1").success).toBe(false);
  });
});
