import { createClient } from "@/lib/supabase/client";

/* Client-side helper for the public `listing-photos` Storage bucket (see
   supabase/migrations/20260714120000_listing_photos_bucket.sql). Uploads are
   scoped to a folder named after the owner's user id — the bucket's RLS
   policies reject writes anywhere else. */

export const LISTING_PHOTOS_BUCKET = "listing-photos";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Uploads one photo and returns its public URL, which is what the listing
    stores in `images`. Photos are immutable once uploaded (random name, no
    overwrites), so the URL can be cached forever. */
export async function uploadListingPhoto(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(`Failed to upload photo: ${error.message}`);

  return supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path).data
    .publicUrl;
}
