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
| `20260730090000_one_review_per_owner.sql` | Unique index on `reviews (owner_id, author_id)`, so a renter has one review per owner instead of unlimited duplicates skewing the count and average. Non-partial by design — it is also the conflict target for the upsert in `submitReview`. Fails if an environment already has duplicate pairs; dedupe (keep the newest per pair) and re-run. Applied 2026-07-30. |

## Edge function: `saved-search-alerts`

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
