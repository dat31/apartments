import { z } from "zod";
import { type LocalizedListing } from "@/schemas/listing";
import { type TourRequest } from "@/schemas/tour";

/** A tour's lifecycle state, as the feed reads it — the same union
    `tourRequestSchema` defines, named here so the item type can say it. */
type TourStatus = TourRequest["status"];

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

/* ---- Categories ----

   The coarser grouping the feed filters by and the settings dialog switches.
   Kinds are what the database records; categories are what a person thinks in
   ("tell me about tours, not about reviews"), and one category covers several
   kinds — a tour is requested, confirmed, moved and cancelled, and nobody
   wants those four decisions separately.

   Deliberately derived here rather than stored as a second Postgres enum: the
   mapping is a product judgement that changes with the UI, and a column would
   have to be backfilled every time it did. The columns of
   `notification_preferences` are named after these keys, so the two lists are
   checked against each other in the unit test. */
export const NOTIFICATION_CATEGORIES = ["tours", "matches", "activity"] as const;

export const notificationCategorySchema = z.enum(NOTIFICATION_CATEGORIES);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

/** Which category a kind belongs to. Exhaustive by type — a new kind fails to
    compile here until it is placed. */
export const NOTIFICATION_KIND_CATEGORY: Record<
  NotificationKind,
  NotificationCategory
> = {
  tour_requested: "tours",
  tour_confirmed: "tours",
  tour_reschedule_proposed: "tours",
  tour_reschedule_accepted: "tours",
  tour_declined: "tours",
  saved_search_match: "matches",
  review_received: "activity",
};

/** The kinds one category covers — what a feed query narrows to. */
export function kindsInCategory(
  category: NotificationCategory
): NotificationKind[] {
  return NOTIFICATION_KINDS.filter(
    (kind) => NOTIFICATION_KIND_CATEGORY[kind] === category
  );
}

/* ---- Delivery preferences ----

   One switch per category, and only one channel: in-app. There is no email
   flag because there is no email — see the migration
   (supabase/migrations/20260805140000_notification_preferences.sql). When a
   sender exists, this becomes a per-channel object and the dialog grows a
   column; until then a switch labelled "Email" would be a promise the app
   cannot keep. */
export const notificationPreferencesSchema = z.object({
  tours: z.boolean(),
  matches: z.boolean(),
  activity: z.boolean(),
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

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
  /** The tour's status *now*, for the same reason `tourRole` is read rather
      than stored: the row says a viewing was requested, and whether that is
      still something to accept is a question only the tour can answer. Null
      when the notification is about no tour, or the tour is gone. */
  tourStatus: TourStatus | null;
};

/* ---- Wire schemas ----

   Static, and separate from any form: a Server Action is a public HTTP
   endpoint, so these guard a boundary rather than an input. */

export const notificationIdSchema = z.uuid();

/** One switch flipped in the settings dialog. An intent rather than a patch —
    a client that could send the whole preferences object could also send a
    profile id, and this way there is nothing to forge. */
export const notificationPreferenceUpdateSchema = z.object({
  category: notificationCategorySchema,
  enabled: z.boolean(),
});
