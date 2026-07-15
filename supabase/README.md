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
