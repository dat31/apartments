# Cron jobs

Three scheduled jobs run against the deployed app. All are ordinary Next.js
Route Handlers under `app/api/cron/`, invoked over HTTP by Vercel Cron on the
schedule declared in `vercel.json`. Neither is a Supabase Edge Function, and
that is deliberate — see [Why they live in the Next.js app](#why-they-live-in-the-nextjs-app).

| Path | Schedule (UTC) | What it does |
| --- | --- | --- |
| `/api/cron/saved-search-alerts` | `9 2 * * *` (daily 02:09 UTC = 09:09 Da Nang) | Turns newly published homes into in-app notifications for renters whose saved searches match. |
| `/api/cron/sweep-empty-channels` | `17 3 * * *` (daily 03:17 UTC = 10:17 Da Nang) | Hard-deletes Stream `messaging` channels that never carried a message. |
| `/api/cron/purge-dismissed-notifications` | `23 4 * * *` (daily 04:23 UTC = 11:23 Da Nang) | Hard-deletes notifications dismissed more than 30 days ago — the other half of the soft delete that makes undo possible. |

---

## The shared shape

All three routes are written to the same template, so what you learn from one
transfers to the others.

### Authentication

```ts
const secret = process.env.CRON_SECRET;
if (!secret) return 503 { error: "CRON_SECRET is not configured" };
if (request.headers.get("authorization") !== `Bearer ${secret}`) return 401;
```

Vercel sends `Authorization: Bearer ${CRON_SECRET}` on every cron invocation
when that env var is set on the project. Two properties matter:

- **A missing secret fails closed (503), it does not run unauthenticated.**
  One route writes into other people's notification feeds and the other two
  hard-delete — chat channels, and notification rows across every feed at
  once; an open endpoint is not an option, so "not configured" has to mean
  "refuse", never "allow".
- **The gate is the only auth.** `proxy.ts` excludes `/api` from its matcher
  (`"/((?!api|ingest|_next|_vercel|.*\\..*|.*opengraph-image).*)"`), so no
  session middleware runs on these paths and there is no cookie behind the
  request. The bearer check is all there is.

### Manual invocation

Same auth, from anywhere:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/cron/saved-search-alerts?dry=1&minutes=180"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/cron/sweep-empty-channels?dry=1&days=7"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/cron/purge-dismissed-notifications?dry=1&days=7"
```

All accept `?dry=1`: compute and report, write nothing. All accept one
window override (`?minutes=N` / `?days=N`), clamped so a typo cannot turn a
routine run into an unbounded one.

### Responses

Always JSON, always `Cache-Control: private, no-store`. A successful run
returns its counts (what it looked at, what it matched, what it wrote) so the
Vercel cron log is a usable audit trail without extra instrumentation. Failures
are logged with a `[cron]` / `[stream]` prefix and answer with a bare
`{ error }` — no internals on the wire.

---

## `saved-search-alerts`

**File:** `app/api/cron/saved-search-alerts/route.ts`

### Why it exists

Saved searches shipped their storage in July 2026 (`saved_searches`,
`saved_search_notifications` in `20260717100000_saved_searches.sql`) and then
stalled: the delivery half was an email Edge Function that nobody could switch
on without an email provider. In-app notifications need no provider, so the
alert a renter was promised when they flipped the toggle now actually arrives.

### The run, end to end

1. **Window.** `since = now - minutes` (default 2880 — 48 hours — clamped to
   `[1, 7 days]`). Twice the daily cadence, and sized to it: Hobby runs a job
   once a day and places it anywhere inside its hour, so two consecutive runs
   can be nearly 25 hours apart, and a tighter window would drop every home
   published in the gap — silently, and every day. 48 hours clears that and
   survives one run being missed outright.

   Overlap costs nothing (see the claim step). What a wider window *does* cost
   is candidates competing for `MAX_MATCHES_PER_SEARCH`, which is why this is
   2× the cadence rather than the 4× the fifteen-minute schedule used to get.

2. **Read (service role, RLS bypassed).** In parallel:
   - `listAlertableSavedSearches()` — every `saved_searches` row with
     `alerts = true`, across all users.
   - `listListingsPublishedSince(since)` — `status = 'active'` listings with
     `published_at >= since`.

   Both live in the service-role section at the bottom of
   `lib/services/notifications.ts` and use `createAdminClient()`
   (`lib/supabase/admin.ts`). This job is cross-user by nature — it reads every
   alerting renter's searches and writes into their feeds — so there is no
   session it could run as and nothing for RLS to scope it to. That is also
   why the route is gated on the secret: the gate replaces the session.

   Bounding candidates by the window rather than by "everything active" is what
   keeps a run's cost flat whether the catalogue holds twenty homes or twenty
   thousand.

3. **Short-circuit.** No listings or no searches → return counts, `sent: 0`.
   This is the common case.

4. **Match** — `matchSavedSearches()` in `lib/notifications/match.ts`, pure and
   unit-tested (`lib/notifications/__tests__/match.test.ts`). Per search:
   - Parse the stored `query_string` with `parseFilters`.
   - Drop candidates where `listing.publishedAt < search.createdAt` (a search
     never alerts about homes that were already on the site when it was saved)
     or `listing.owner === search.profileId` (nobody needs telling their own
     home went live).
   - Run the survivors through `filterListings(candidates, filters, "newest")`
     and take the first `MAX_MATCHES_PER_SEARCH` (10). The cap is not about
     cost — the per-account search cap is 10 and candidates are already
     window-bounded — it stops a broad search ("everything in Da Nang") dumping
     forty rows into one feed after a bulk import. Unclaimed leftovers are
     picked up by the next run.

   Dedupe is deliberately *not* here: which pairs were already sent is a
   database fact, decided atomically in the next step.

5. **Claim** — `claimSavedSearchMatches(pairs)` upserts into
   `saved_search_notifications` with
   `{ onConflict: "saved_search_id,listing_id", ignoreDuplicates: true }`
   (i.e. `ON CONFLICT DO NOTHING`) and `.select()`s the result, so it returns
   **only the pairs this call actually won**.

   The dedupe row is the lock, which is why it is written *before* the
   notification. Two overlapping runs compute the same matches; the loser gets
   an empty list back and sends nothing. The other order would leave a window
   in which a retry double-notifies.

6. **Notify** — `insertSavedSearchNotifications()` inserts one
   `notifications` row per claimed pair: `kind: 'saved_search_match'`,
   `profile_id`, `saved_search_id`, `listing_id`, and no `actor_id` (a match is
   caused by the catalogue, not by a person). This is the only non-trigger
   insert into `notifications` in the app.

7. **Report** — `{ since, searches, listings, matched, sent }`.

### `?dry=1`

Returns `{ dry: true, ..., matched, pairs: [[savedSearchId, listingId], …] }` —
**ids only**. A dry run is an operator's tool and the homes and searches
involved are other people's.

### What makes "new" new

`listings.published_at`, added in `20260804120000_notifications.sql` with a
`before insert or update of status` trigger that stamps `now()` only on the
transition *into* `active`. `created_at` would call a June draft published
today old; re-saving an already-active listing must not re-publish it, or an
owner fixing a typo would re-alert every matching search. Existing active rows
were backfilled to `created_at` — safely in the past, so the lookback window
never picks them up.

### Where these notifications go

`notifications` has **no INSERT policy at all**. Rows come from
`SECURITY DEFINER` triggers (`notify_tour_counterparty`,
`notify_review_received`) or from this cron via the service role; a client can
read and set its own `read_at` and `dismissed_at` (`grant update (read_at,
dismissed_at)`, nothing else) — never forge, and since `20260805090000`, never
delete either. The feed is rendered through `lib/services/notifications.ts`
(per-user section) and linked by `notificationHref()` in
`lib/notifications/target.ts`, which sends a `saved_search_match` straight to
`/apartments/{id}`.

---

## `sweep-empty-channels`

**File:** `app/api/cron/sweep-empty-channels/route.ts`
**Background:** `docs/plans/messaging-empty-channels.md`

### Why it exists

Channel provisioning is eager by design: membership must be set server-side
from RLS-checked rows, so a channel exists from "intent to maybe talk", not
from the first message. "Message owner" taps that never send therefore
accumulate empty channels. The inbox already hides them
(`last_message_at: { $exists: true }`); this sweep bounds the server-side
accumulation itself.

Deletion is safe by construction: every surface that touches a channel calls an
idempotent `ensure*` action first (tour panels, "Message owner"), so a swept
channel is transparently re-created on the next legitimate open. An empty
channel has no messages and no read state worth keeping — hence hard delete.

### The run, end to end

1. **Cutoff.** `days` (default 30). Minimum 1 on a live run, 0 allowed under
   `?dry=1`: a live sweep at 0 could race a channel someone opened seconds ago
   and is about to type into.

2. **Collect.** Paginate `client.queryChannels()` (Stream server client,
   `lib/stream/server.ts`) over
   `{ type: CHANNEL_TYPE, last_message_at: { $exists: false }, created_at: { $lt: cutoff } }`,
   sorted `created_at: 1`, `state: false`, 30 per page (Stream's server-side
   page cap) for at most 10 pages — 300 channels, which bounds a run well
   inside the function timeout. Leftovers wait for tomorrow.

   Each result is re-checked for `!channel.data?.last_message_at` before its
   cid is collected. The filter already guarantees it; a deletion must never
   depend on a filter alone.

   Collect first, delete after — `deleteChannels` is an async task, so deleting
   while paginating would shift offsets under the query.

3. **Delete.** `client.deleteChannels(batch, { hard_delete: true })` in batches
   of 100 (Stream's per-call cid cap), collecting the returned `task_id`s.
   Skipped entirely under `?dry=1`.

4. **Report** — `{ dry, cutoffDays, matched, deleted, taskIds }`, plus the raw
   `cids` on a dry run. Stream failures answer `502`.

---

## `purge-dismissed-notifications`

**File:** `app/api/cron/purge-dismissed-notifications/route.ts`
**Migration:** `20260805090000_notification_dismissal.sql`

### Why it exists

Dismissing a notification used to be a hard `DELETE`, which made undo not
merely unbuilt but impossible: `notifications` has no INSERT policy, so a row
that is really gone cannot be put back by the person who dropped it, nor by a
Server Action running on their cookie. Dismissal is therefore a soft delete —
`dismissed_at` is stamped on the way out and cleared by undo — and every read
in the per-user section of `lib/services/notifications.ts` says
`dismissed_at is null`.

That leaves rows which are invisible but still stored, and nothing else removes
them: the client's DELETE policy was dropped along with the hard delete, so
this route is the only path by which a notification leaves the table.

### The run, end to end

1. **Cutoff.** `days` (default 30). Minimum 1 on a live run, 0 allowed under
   `?dry=1` — a live purge at 0 could take a dismissal made seconds ago, while
   its undo toast is still on screen.

   Thirty days is far past any undo and far past anyone's memory of the item.
   What it buys is a window in which "I dismissed something by accident last
   week" is still answerable from the database.

2. **Delete** — `purgeDismissedNotifications(cutoff)` in the service-role
   section, one statement: `dismissed_at is not null and dismissed_at <
   cutoff`, `.select("id")` for the count. `.lt` on a nullable column already
   excludes NULLs; the redundant `is not null` is there because this is the one
   query in the app that destroys notifications and it should read as narrow as
   it is. Backed by `notifications_dismissed_idx`, partial on
   `dismissed_at is not null` so it indexes only the rows the sweep can reach.

3. **Report** — `{ dry, cutoffDays, cutoff, matched, deleted }`. A dry run
   calls `countDismissedNotificationsBefore` instead and returns `deleted: 0`.
   No ids in either case: the saved-search dry run returns ids because an
   operator needs to trace a pair, but here the only useful answer is how many.

---

## Why they live in the Next.js app

There was already a Deno Edge Function written for saved-search alerts. It
carried a hand-maintained copy of the browse-page predicate, with a comment
asking the next person to keep the two in sync.

A renter's saved search has to return exactly what the same URL returns on
Browse. The only way to guarantee that is to run the same function — so
`lib/notifications/match.ts` imports `filterListings` and `parseFilters`
straight from `app/[lang]/(app)/apartments/lib/query`. That import is the whole
reason this is a Route Handler and not an Edge Function. The channel sweep
follows for a simpler reason: it needs the Stream server client and the app's
`CHANNEL_TYPE`.

## Deployment

Required env vars on the Vercel project:

| Var | Used by | Effect if missing |
| --- | --- | --- |
| `CRON_SECRET` | all three routes | Route answers `503`; the cron runs but does nothing. |
| `SUPABASE_SERVICE_ROLE_KEY` | `saved-search-alerts`, `purge-dismissed-notifications` | `createAdminClient()` throws on the first request that needs it. |
| Stream server credentials | `sweep-empty-channels` | Sweep answers `502`. |

Notes:

- `CRON_SECRET` can be any random string; Vercel injects it into the cron
  request's `Authorization` header automatically once it is set.
- `vercel.json` `crons` entries only take effect on production deployments.
- **All three schedules are daily, because the project is on Vercel's Hobby
  plan.** That plan allows 100 cron jobs but a minimum interval of once per
  day, and a sub-daily expression is not silently downgraded — it *fails the
  deployment*: "Hobby accounts are limited to daily cron jobs. This cron
  expression would run more than once per day." `saved-search-alerts` ran
  `*/15 * * * *` while it was unshipped; that would have broken the first
  production deploy.
- **The minute in each schedule is aspirational on Hobby.** Scheduling
  precision is per-hour: `9 2 * * *` fires anywhere in 02:00–02:59 UTC. The
  three jobs are kept in separate hours rather than separate minutes, which is
  the only separation the plan actually honours. The minutes become real on
  Pro, which also lifts the interval to once per minute — the only thing that
  would let `saved-search-alerts` go back to a tight cadence, and the lookback
  window should shrink with it if it does.
- No route sets `maxDuration`; each is bounded by its own page/batch cap
  instead, and all three are dynamic (they read `searchParams`), so nothing is
  cached.

## Adding another job

1. Create `app/api/cron/<name>/route.ts` exporting `GET`.
2. Copy the auth block verbatim — the 503-when-unset behaviour is the important
   half.
3. Support `?dry=1` and clamp any window parameter.
4. Return JSON counts with `Cache-Control: private, no-store`.
5. Add the `{ path, schedule }` entry to `vercel.json` — daily or less often
   while the project is on Hobby, in an hour no other job uses, and size any
   lookback window to that cadence rather than to the schedule you wanted.
6. If it needs to bypass RLS, put the queries in the service-role section of a
   service module (as `lib/services/notifications.ts` does) rather than
   reaching for `createAdminClient()` from the route — keeping every RLS bypass
   in one reviewable place is the point.
