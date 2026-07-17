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
