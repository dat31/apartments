import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type Listing } from "@/schemas/listing";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_KIND_CATEGORY,
  NOTIFICATION_KINDS,
  type Notification,
  type NotificationCategory,
  type NotificationKind,
  type NotificationPreferences,
} from "@/schemas/notification";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { LISTING_SELECT, toListing } from "./listings-map";
import { toNotification } from "./notifications-map";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Notifications service.

   Two sections, and the split is the point:

   • Per-user (below) — the feed a signed-in person reads and
     marks. Cookie-bound, uncached, every function starts at
     requireUser(). Clients can only ever read, mark read, and
     dismiss their own; the migration grants no INSERT at all, so
     nobody can forge news.

   • Service-role (bottom) — the saved-search cron and the
     dismissal sweep. Cross-user by nature: one reads every
     alerting renter's searches and writes into their feeds, the
     other deletes across every feed at once, so there is no
     session either could run as. Nothing here is reachable from a
     Server Action.

   Dismissal is a soft delete (`dismissed_at`), which is what
   makes undo possible at all: with no INSERT policy, a row that
   is really gone can never be put back by the person who dropped
   it. Every read below therefore says `dismissed_at is null` —
   the column is not a filter the UI opts into, it is what "in my
   feed" means.

   Rows for tour and review events are written by Postgres
   triggers, not from here — the event is always caused by the
   *other* party's session, so the writer and the recipient are
   different people. See the migration.
   ============================================================ */

/* Two foreign keys point at `profiles` (the recipient and the actor), so an
   embedded read has to name the one it means — the same disambiguation
   virtual_tour_scenes needs (supabase/README.md). Without the FK name
   PostgREST refuses the query rather than guessing. */
const NOTIFICATION_SELECT = `
  *,
  actor:profiles!notifications_actor_id_fkey(id, name, palette),
  listing:listings(${LISTING_SELECT}),
  tour:tours(renter_id, status)
` as const;

type NotificationRow = Tables<"notifications"> & {
  actor: Pick<Tables<"profiles">, "id" | "name" | "palette"> | null;
  listing: Parameters<typeof toListing>[0] | null;
  tour: Pick<Tables<"tours">, "renter_id" | "status"> | null;
};

/** A notification with its subjects resolved, before localization. The action
    localizes the listing, exactly as it does for tours. */
export type NotificationRecord = Notification & {
  listing: Listing | null;
  tourRole: "renter" | "owner" | null;
  tourStatus: Tables<"tours">["status"] | null;
};

/* The all-on state a person has before they ever open the settings dialog, and
   the fallback when the row is missing. Kept here rather than read from the
   column defaults so a feed query never needs a round trip to learn that
   somebody has expressed no preference. */
export const NOTIFICATION_PREFERENCE_DEFAULTS: NotificationPreferences = {
  tours: true,
  matches: true,
  activity: true,
};

/** The caller's category switches, defaulted when they have never set any. */
export async function getMyNotificationPreferences(): Promise<NotificationPreferences> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("tours, matches, activity")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  // No row is not an absence of preferences, it *is* the default one.
  return data ?? NOTIFICATION_PREFERENCE_DEFAULTS;
}

/**
 * Flip one category on or off.
 *
 * An upsert rather than an update: the first flip is also the row's insert,
 * and the alternative — creating a row on signup — would write a row for every
 * account to say exactly what its absence already says. The other categories
 * come from the current preferences rather than from the client, so a switch
 * can only ever move the one it names.
 */
export async function setMyNotificationPreference(
  category: NotificationCategory,
  enabled: boolean
): Promise<void> {
  const user = await requireUser();
  const current = await getMyNotificationPreferences();

  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      ...current,
      [category]: enabled,
      // Not forgeable: the WITH CHECK on the insert policy pins this to the
      // session, so a doctored payload is rejected by Postgres rather than
      // trusted here.
      profile_id: user.id,
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    console.error("[notifications] preference write failed", error);
    throw new ServiceError("failed", error.message);
  }
}

/* The kinds a set of preferences lets through.

   Applied at read time, so muting a category hides its history and unmuting
   brings it back — the triggers keep writing whatever the switches say (see
   the migration). Returns null for "everything", which is the common case and
   the one that should not add a filter to the query. */
function allowedKinds(prefs: NotificationPreferences): NotificationKind[] | null {
  const muted = NOTIFICATION_CATEGORIES.filter((c) => !prefs[c]);
  if (!muted.length) return null;
  return NOTIFICATION_KINDS.filter(
    (kind) => prefs[NOTIFICATION_KIND_CATEGORY[kind]]
  );
}

/* The popover shows a handful; the page shows a page's worth. Bounded either
   way — a feed is append-only and nobody scrolls a year of it. */
export const NOTIFICATION_PAGE_SIZE = 50;

/**
 * The caller's notifications, newest first.
 *
 * RLS limits the table to rows addressed to the caller, so there is no
 * ownership filter to state here — but the embedded reads still obey their own
 * policies, which is deliberate: a tour notification whose listing the owner
 * has since unpublished comes back with `listing: null` rather than leaking a
 * draft, and the item renders without the home's name.
 */
export async function listMyNotifications(
  limit: number = NOTIFICATION_PAGE_SIZE
): Promise<NotificationRecord[]> {
  const user = await requireUser();
  const kinds = allowedKinds(await getMyNotificationPreferences());
  // Every category muted. `.in("kind", [])` would answer the same thing, but
  // not asking is cheaper and says what it means.
  if (kinds?.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .is("dismissed_at", null);
  if (kinds) query = query.in("kind", kinds);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new ServiceError("failed", error.message);

  return ((data ?? []) as unknown as NotificationRow[]).map((row) => ({
    ...toNotification(row),
    listing: row.listing ? toListing(row.listing) : null,
    /* Which side of the tour the *recipient* is on, which decides where the
       item links. Read from the joined row rather than stored on the
       notification, so it can't drift from the tour it describes. */
    tourRole: row.tour
      ? row.tour.renter_id === user.id
        ? "renter"
        : "owner"
      : null,
    /* Read for the same reason, and used for a stricter one: the feed offers
       "Accept" on a tour request, and a button that acts on a tour someone
       already answered elsewhere is worse than no button. */
    tourStatus: row.tour?.status ?? null,
  }));
}

/** How many unread the caller has — what the bell badge renders. */
export async function countMyUnreadNotifications(): Promise<number> {
  await requireUser();
  /* The same filter the feed applies, for the same reason it has to be here
     too: a badge counting notifications the list will not show sends people
     looking for news that isn't there. */
  const kinds = allowedKinds(await getMyNotificationPreferences());
  if (kinds?.length === 0) return 0;

  const supabase = await createClient();
  // head: true asks for the count and no rows; this runs on every page whose
  // badge cache went stale, so it must not ship a payload.
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    // Load-bearing: without it, dismissing an unread notification leaves the
    // badge counting a row nobody can see any more.
    .is("dismissed_at", null);
  if (kinds) query = query.in("kind", kinds);

  const { count, error } = await query;

  if (error) throw new ServiceError("failed", error.message);
  return count ?? 0;
}

/** Mark one of the caller's notifications read. Idempotent by design — a
    second click sets the same column to a new timestamp and changes nothing
    the UI shows. */
export async function markNotificationRead(id: string): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    // RLS already scopes this, but the query says whose row it means: a zero
    // row result then reads as not-found rather than as a silent success the
    // UI reports as done.
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id");

  if (error) {
    console.error("[notifications] mark read failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
}

/** Mark every unread notification of the caller's read. Returns nothing:
    "there was nothing to mark" is a success, not a not-found. */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  const kinds = allowedKinds(await getMyNotificationPreferences());
  if (kinds?.length === 0) return;

  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null)
    // "All" means all of what the user can see. Marking a dismissed row read
    // would decide, on their behalf, that an item they undo later has already
    // been looked at.
    .is("dismissed_at", null);
  // And for the same reason, not a muted category's backlog: switching tours
  // back on should show what was missed, not a stack of pre-read rows.
  if (kinds) query = query.in("kind", kinds);

  const { error } = await query;

  if (error) {
    console.error("[notifications] mark all read failed", error);
    throw new ServiceError("failed", error.message);
  }
}

/**
 * Dismiss one of the caller's notifications: out of the feed, still on the row.
 *
 * Idempotent. Dismissing an already-dismissed notification moves the timestamp
 * and succeeds, which is what a double click or a click from a stale popover
 * list is — reporting not-found there would make the UI restore a row the user
 * has already got rid of. `not-found` is reserved for a row that is genuinely
 * gone: purged by the sweep, or never theirs.
 */
export async function dismissNotification(id: string): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id");

  if (error) {
    console.error("[notifications] dismiss failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
}

/**
 * Put a dismissed notification back — what the undo in the toast calls.
 *
 * The counterpart to the soft delete, and the reason it is a soft delete: this
 * is an UPDATE on a row the caller already owns, so it needs nothing the
 * dismiss did not already need. A hard delete would have made this an INSERT,
 * and there is no INSERT policy on this table for anyone.
 *
 * Idempotent in the same way and for the same reason: restoring something that
 * was never dismissed is a no-op success, not an error.
 */
export async function restoreNotification(id: string): Promise<void> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ dismissed_at: null })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id");

  if (error) {
    console.error("[notifications] restore failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
}

/* ============================================================
   Service-role — the crons only.

   Everything below bypasses RLS, so each function states its own
   scope in the query and none of them takes a user id that
   decides what comes back. They are not exported through
   lib/actions: the only callers are the two route handlers under
   app/api/cron/, both gated on CRON_SECRET.
   ============================================================ */

/** An alerting saved search, with the two fields matching needs beyond the
    query itself: who to notify, and when they saved it (a search never
    matches a home that was already published when it was created). */
export type AlertableSearch = {
  id: string;
  profileId: string;
  queryString: string;
  createdAt: string;
};

/** A candidate listing, carrying the moment it became visible. */
export type PublishedListing = Listing & { publishedAt: string };

export async function listAlertableSavedSearches(): Promise<AlertableSearch[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, profile_id, query_string, created_at")
    .eq("alerts", true);

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    queryString: row.query_string,
    createdAt: row.created_at,
  }));
}

/** Active listings published on or after `since` — the run's candidates.

    Bounded by the lookback window rather than by "everything active", so a run
    costs the same whether the catalogue has twenty homes or twenty thousand.
    Overlapping windows are free: the dedupe table is what stops a second
    notification, not a precise cursor. */
export async function listListingsPublishedSince(
  since: string
): Promise<PublishedListing[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .gte("published_at", since);

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? [])
    .filter((row) => row.published_at !== null)
    .map((row) => ({
      ...toListing(row),
      publishedAt: row.published_at as string,
    }));
}

export type MatchPair = { savedSearchId: string; listingId: string };

/**
 * Claim (search, listing) pairs as notified, returning only the ones this call
 * actually won.
 *
 * The dedupe row is the lock, which is why it is written *before* the
 * notification rather than after: two overlapping runs both compute the same
 * matches, and the one that loses the insert gets an empty list back and sends
 * nothing. Writing the notification first and the dedupe after would leave a
 * window where a retry double-notifies.
 *
 * `ignoreDuplicates` turns the upsert into ON CONFLICT DO NOTHING, so
 * `.select()` returns the inserted rows and nothing else.
 */
export async function claimSavedSearchMatches(
  pairs: MatchPair[]
): Promise<MatchPair[]> {
  if (!pairs.length) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("saved_search_notifications")
    .upsert(
      pairs.map((p) => ({
        saved_search_id: p.savedSearchId,
        listing_id: p.listingId,
      })),
      { onConflict: "saved_search_id,listing_id", ignoreDuplicates: true }
    )
    .select("saved_search_id, listing_id");

  if (error) {
    console.error("[notifications] claim failed", error);
    throw new ServiceError("failed", error.message);
  }
  return (data ?? []).map((row) => ({
    savedSearchId: row.saved_search_id,
    listingId: row.listing_id,
  }));
}

/** Write saved-search match notifications. The only insert in the app that
    isn't a trigger — there is no session behind a cron run, and matching is
    the app's own predicate rather than something SQL could express. */
export async function insertSavedSearchNotifications(
  rows: { profileId: string; savedSearchId: string; listingId: string }[]
): Promise<number> {
  if (!rows.length) return 0;

  const supabase = createAdminClient();
  const insert: TablesInsert<"notifications">[] = rows.map((row) => ({
    profile_id: row.profileId,
    kind: "saved_search_match",
    saved_search_id: row.savedSearchId,
    listing_id: row.listingId,
    // No actor: a match is caused by the catalogue, not by a person.
  }));

  const { error } = await supabase.from("notifications").insert(insert);

  if (error) {
    console.error("[notifications] saved-search insert failed", error);
    throw new ServiceError("failed", error.message);
  }
  return insert.length;
}

/**
 * Hard-delete notifications dismissed before `before`. Returns how many went.
 *
 * The other half of the soft delete. Dismissed rows are invisible but not
 * free, and nothing else in the app ever removes one — the client's DELETE
 * policy was dropped along with the hard delete, so this is now the only path
 * by which a notification leaves the table.
 *
 * Service role because it is cross-user: it sweeps every feed at once and
 * there is no session that spans them. Deliberately takes an absolute cutoff
 * rather than a day count — the route clamps the window, and a service that
 * did its own arithmetic on an unclamped number is how a sweep ends up
 * deleting everything.
 */
export async function purgeDismissedNotifications(
  before: string
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    // `.lt` on a nullable column already excludes NULLs, so a row still in
    // someone's feed cannot match. Stated anyway: this is the one query in the
    // app that destroys notifications, and it should read as narrow as it is.
    .not("dismissed_at", "is", null)
    .lt("dismissed_at", before)
    .select("id");

  if (error) {
    console.error("[notifications] purge failed", error);
    throw new ServiceError("failed", error.message);
  }
  return data?.length ?? 0;
}

/** How many rows the sweep *would* take — what `?dry=1` reports. */
export async function countDismissedNotificationsBefore(
  before: string
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .not("dismissed_at", "is", null)
    .lt("dismissed_at", before);

  if (error) throw new ServiceError("failed", error.message);
  return count ?? 0;
}
