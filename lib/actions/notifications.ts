"use server";

import { getLocale } from "next-intl/server";

import {
  notificationIdSchema,
  notificationPreferenceUpdateSchema,
  type NotificationCategory,
  type NotificationItem,
  type NotificationPreferences,
} from "@/schemas/notification";
import {
  countMyUnreadNotifications,
  dismissNotification,
  getMyNotificationPreferences,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  restoreNotification,
  setMyNotificationPreference,
} from "@/lib/services/notifications";
import { localizeListing } from "@/schemas/listing";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Notification entry points.

   Nothing here expires a server cache: the feed is per-user data
   read through these actions, never through a "use cache"
   boundary, so react-query invalidation on the client is the
   whole story.

   Note there is no `createNotificationAction`, and there never
   should be. Rows come from Postgres triggers and the cron; a
   client that could name a recipient could put words in anyone's
   feed.
   ============================================================ */

/** The caller's feed, with each item's listing localized for this request.

    Same job a page boundary does for server-rendered listings, and the same
    call `fetchTours` makes — the notification sentence names the home, so the
    copy has to be in the reader's language by the time it reaches the client. */
export async function fetchMyNotifications(
  limit?: number
): Promise<ActionResult<NotificationItem[]>> {
  const locale = await getLocale();
  return toResult(async () =>
    (await listMyNotifications(limit)).map((row) => ({
      ...row,
      listing: row.listing ? localizeListing(row.listing, locale) : null,
    }))
  );
}

/** Unread count for the bell badge. */
export async function fetchUnreadNotificationCount(): Promise<
  ActionResult<number>
> {
  return toResult(countMyUnreadNotifications);
}

export async function markNotificationReadAction(
  id: string
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => markNotificationRead(parsed.data));
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return toResult(markAllNotificationsRead);
}

/** Take a notification out of the caller's feed. Reversible — see below. */
export async function dismissNotificationAction(
  id: string
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => dismissNotification(parsed.data));
}

/** Undo a dismissal. Its own entry point rather than a flag on the one above,
    because they are separate intents at the call site: the toast's undo has to
    be able to fire after the dismissal has already been acknowledged. */
export async function restoreNotificationAction(
  id: string
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => restoreNotification(parsed.data));
}

/** The caller's category switches — what the settings dialog renders. */
export async function fetchNotificationPreferences(): Promise<
  ActionResult<NotificationPreferences>
> {
  return toResult(getMyNotificationPreferences);
}

/** Flip one category. One switch per call, so the payload can name a category
    and a boolean and nothing else. */
export async function updateNotificationPreferenceAction(
  category: NotificationCategory,
  enabled: boolean
): Promise<ActionResult> {
  const parsed = notificationPreferenceUpdateSchema.safeParse({
    category,
    enabled,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() =>
    setMyNotificationPreference(parsed.data.category, parsed.data.enabled)
  );
}
