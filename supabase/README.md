# Supabase migrations

The project's original schema (tables, RLS) was created directly in the
Supabase dashboard and is not tracked here; this directory only holds
migrations added since.

Apply a migration either by pasting it into the dashboard's SQL editor, or
with the Supabase CLI against the linked project:

```sh
supabase db push
```

| Migration | What it does |
| --- | --- |
| `20260714120000_listing_photos_bucket.sql` | Creates the public `listing-photos` Storage bucket (5 MB/photo, image MIME types only) with owner-scoped write policies. Required for the photo uploader — without it, uploads in the listing form fail. |
| `20260716090000_listing_costs.sql` | Cost transparency (improvement #13): nullable `deposit`, `deposit_amount`, per-utility billing mode/amount, and `min_lease_months` columns on `listings`, plus plausible values for the seed rows. Applied 2026-07-16. |
| `20260717100000_saved_searches.sql` | Saved-search alerts (improvement #3): `saved_searches` (owner-scoped RLS, 10-per-user cap trigger) and the `saved_search_notifications` dedupe table. The publish trigger that would invoke the `saved-search-alerts` Edge Function is deliberately not wired yet — add it once the email provider is configured. Applied 2026-07-17. |
| `20260731120000_virtual_tours.sql` | 360° virtual tours: `listing_virtual_tours` + `virtual_tour_scenes` (owner-scoped RLS, public reads only for a published tour on an active listing), the trigger-maintained `listings.has_virtual_tour` flag the browse badge reads, and the public `listing-panoramas` Storage bucket (20 MB, JPEG/WebP/AVIF) the phase-3 uploader will write to. **Required** before `lib/services/virtual-tours.ts` reads Postgres. Note `entry_scene_id` makes a *second* FK between the two tables, so an embedded PostgREST read must name the one it means: `virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)`. Applied 2026-07-31. |
| `20260731120100_seed_virtual_tours.sql` | Seeds the tours the demo module derives today (five CC0 rooms from `public/panoramas`, four for a studio) for two active listings in three, so switching the read path changes nothing a renter sees. Re-runnable. Requires the migration above. Applied 2026-07-31: 13 of the 22 active listings got a published tour, 60 scene rows. |
| `20260802120000_listing_translations.sql` | Multilingual listing content: `listing_translations` (one row per listing+locale for `title`/`description`, owner-scoped RLS mirroring `listing_virtual_tours`) and `listings.base_locale`, which records the language the base columns are written in. The base copy deliberately stays on `listings` and stays `NOT NULL`, so no read path can render a blank home and the existing denormalisations keep working — see `docs/plans/multilingual-listing-content.md` §1a. The backfill splits the ten `"<VI> · <EN>"` seed rows apart and classifies every row's base language from its content; it is a pure function of current content, so re-running is a no-op. **Regenerate `lib/database.types.ts` after applying.** Note PostgREST embeds this as `listing_translations(*)` — a single FK, so unlike `virtual_tour_scenes` it needs no disambiguation. Applied 2026-08-02: 10 `en` translation rows; `base_locale` vi=15, en=13. |
| `20260804081614_tour_slot_date.sql` | Adds `tours.slot_date`, a stored generated column holding the day a tour actually holds (`proposed_date` once a reschedule is on the table, `date` otherwise), plus an index on `(owner_id, slot_date)`. It mirrors `tourSlot()` in `app/[lang]/(app)/apartments/[id]/constants/tours.ts` — change one and change the other. **Required** before `lib/services/tours.ts` reads: `listLiveTours` / `listPastTours` filter on it, so without the column the owner dashboard's tour queries 400. The cutoff date is passed in by the caller, never computed here — "today" is the Da Nang day, which `now()` in a UTC database gets wrong for seven hours a night. **Regenerate `lib/database.types.ts` after applying.** Note the generator lists `slot_date` in `Insert`/`Update` as well as `Row` even though Postgres rejects writing it — services must not put it in a patch; `writeTour` takes `TablesUpdate<"tours">` and nothing sets it. Applied 2026-08-04: all 10 existing rows had `proposed_date` null, so every `slot_date` equals its `date`. |
| `20260804161500_shift_demo_tours_forward.sql` | Demo data only: moves elapsed tour requests forward by whole weeks so the owner dashboard has something to show. Whole weeks because availability is a weekly template — an arbitrary offset lands tours on days their owner does not work. Keeps the earliest elapsed tour and every declined one where they are, so the "Past" section isn't empty either. Re-runnable: afterwards nothing matches its `WHERE`. Requires `20260804081614_tour_slot_date` only in the sense that it exists to feed the sections that migration defines. Applied 2026-08-04 by hand as a one-off `+35 days` (the two 2026-07-07 rows held back); this file is the reproducible form of that edit and is a no-op against the current database. |
| `20260730090000_one_review_per_owner.sql` | Unique index on `reviews (owner_id, author_id)`, so a renter has one review per owner instead of unlimited duplicates skewing the count and average. Non-partial by design — it is also the conflict target for the upsert in `submitReview`. Fails if an environment already has duplicate pairs; dedupe (keep the newest per pair) and re-run. Applied 2026-07-30. |
| `20260804120000_notifications.sql` | In-app notifications: the `notification_kind` enum, the `notifications` table (read/delete own, and an UPDATE policy paired with `grant update (read_at)` — RLS can't scope a column, so "mark read" can't become "rewrite the row"), and **no INSERT policy at all**. Rows come from `SECURITY DEFINER` triggers: `notify_tour_counterparty` on `tours` and `notify_review_received` on `reviews` (INSERT only — `submitReview` upserts, and an edit is not news). The tour trigger derives the recipient as "the party who is not `auth.uid()`", which is what makes `tour_declined` correct from either side; when `auth.uid()` is null nobody human acted and it writes nothing. Also adds `listings.published_at` + its trigger, which is what the saved-search cron treats as "new" — `created_at` would call a June draft published today old. **Regenerate `lib/database.types.ts` after applying.** Applied 2026-08-04: 22 active listings backfilled. |
| `20260805090000_notification_dismissal.sql` | Makes dismissing a notification reversible: adds `notifications.dismissed_at`, so dismissal is a soft delete and undo is an UPDATE the user is already entitled to make. A hard delete could not be undone at all — the table has no INSERT policy, by design — and the alternative, a client-side tombstone plus a deferred delete, is lost on reload and invisible to other tabs. Widens the column grant to `update (read_at, dismissed_at)` (the policy still can't scope a column), renames the UPDATE policy to "Users update own notification state", and **drops the client DELETE policy**: rows now leave this table only via `/api/cron/purge-dismissed-notifications`, never on a click. Both existing indexes are recreated partial on `dismissed_at is null` — the reads all filter on it now, so without the predicate the planner stops matching them — plus `notifications_dismissed_idx` for the sweep. **Regenerate `lib/database.types.ts` after applying.** Applied 2026-08-05: 6 existing notifications, all left with `dismissed_at` null (nothing to backfill — an un-dismissed row is exactly what null means). |

## Edge function: `saved-search-alerts`

> **Superseded, 2026-08-04.** Saved-search alerts now ship as in-app
> notifications from `app/api/cron/saved-search-alerts/route.ts`, which calls
> the app's own `filterListings` instead of the copy of that predicate this
> function carries. The function is still deployed and still inert. Leave it
> until email is genuinely wanted; the notes below are what wiring it would
> take, and the `saved_search_notifications` dedupe table is now written by
> the cron route.

The function runs with the service-role key and resolves users' private emails,
so it **must not** be invokable by the public anon key. It requires an
`ALERT_TRIGGER_SECRET` secret and rejects any request whose `x-alert-secret`
header does not match (401). When wiring the publish trigger, have it POST the
same secret in that header:

```sh
supabase secrets set ALERT_TRIGGER_SECRET=<random-secret>
```

The header check is the authoritative gate. If the function is nonetheless
deployed with `--no-verify-jwt`, the secret is still required; if `verify_jwt`
stays on, the secret is an additional requirement on top of the JWT.
