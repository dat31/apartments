-- Public bucket for listing photos. Replaces storing base64 data URLs in
-- listings.images: the uploader puts files here and the listing keeps their
-- public URLs, so next/image can optimize them and rows/payloads stay small.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880, -- 5 MB per photo
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do nothing;

-- Reads go through the bucket's public URL; the policies below only govern
-- writes. Owners may only write inside a folder named after their user id.

create policy "Owners upload own listing photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Owners delete own listing photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
