import { z } from "zod";
import { type LocalizedListing } from "@/schemas/listing";

/* ============================================================
   Notification domain schema.

   A notification is a `kind` plus the ids it is about. It
   deliberately carries no prose: the sentence is assembled from
   the `notifications` message namespace at render time, so both
   locales work and switching language re-renders correctly.
   Compare `saved_searches.locale`, which exists only because an
   *email* leaves the app and has to pick a language once.

   `data` is the exception, and only for values that have no
   translation — a tour's date and time, a review's rating.
   ============================================================ */

/* Mirrors the notification_kind Postgres enum
   (supabase/migrations/20260804120000_notifications.sql). The unit test
   asserts the two lists match; adding a kind means touching both, plus a
   sentence in messages/{vi,en}.json. */
export const NOTIFICATION_KINDS = [
  "tour_requested",
  "tour_confirmed",
  "tour_reschedule_proposed",
  "tour_reschedule_accepted",
  "tour_declined",
  "review_received",
  "saved_search_match",
] as const;

export const notificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

/* Untranslatable snapshot values. Every field is optional because which ones
   are present is decided by the kind — a review carries a rating and no slot,
   a tour the reverse. */
export const notificationDataSchema = z.object({
  date: z.string().nullish(),
  time: z.string().nullish(),
  rating: z.number().nullish(),
});
export type NotificationData = z.infer<typeof notificationDataSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  kind: notificationKindSchema,
  /** Who caused it, or null once that account is gone. */
  actor: z
    .object({ id: z.string(), name: z.string(), palette: z.number() })
    .nullable(),
  listingId: z.string().nullable(),
  tourId: z.string().nullable(),
  savedSearchId: z.string().nullable(),
  data: notificationDataSchema,
  read: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** A notification with the subjects the UI actually renders resolved.

    The listing arrives localized (the action does that with the request's
    locale, as `fetchTours` does), so the item can name the home without a
    second read. `tourRole` says which side of the tour the *recipient* is on;
    it decides where a tour notification links, and it is computed at read time
    from the joined tour rather than denormalized at write time, so it cannot
    drift from the row. */
export type NotificationItem = Notification & {
  listing: LocalizedListing | null;
  tourRole: "renter" | "owner" | null;
};

/* ---- Wire schemas ----

   Static, and separate from any form: a Server Action is a public HTTP
   endpoint, so these guard a boundary rather than an input. */

export const notificationIdSchema = z.uuid();
