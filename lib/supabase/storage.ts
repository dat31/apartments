import { createClient } from "@/lib/supabase/client";
import {
  PREVIEW_SIZE,
  panoramaTargetSize,
  rejectPanorama,
  type PanoramaRejection,
} from "@/lib/virtual-tour/panorama-spec";

/* Client-side helpers for the public Storage buckets (see
   supabase/migrations/20260714120000_listing_photos_bucket.sql and
   …/20260731120000_virtual_tours.sql). Uploads are scoped to a folder named
   after the owner's user id — the buckets' RLS policies reject writes
   anywhere else.

   The rules these helpers enforce live in lib/virtual-tour/panorama-spec:
   this module is the DOM/network boundary and is excluded from coverage, so
   anything worth asserting belongs there instead. */

export const LISTING_PHOTOS_BUCKET = "listing-photos";
export const LISTING_PANORAMAS_BUCKET = "listing-panoramas";

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

/* ---- panoramas ------------------------------------------------------- */

/** Thrown when a file can't be a room. `reason` is a
    lib/virtual-tour/panorama-spec code, so the uploader can explain *which*
    rule was broken rather than showing a generic failure. */
export class PanoramaRejected extends Error {
  constructor(readonly reason: PanoramaRejection) {
    super(`Panorama rejected: ${reason}`);
    this.name = "PanoramaRejected";
  }
}

export type UploadedPanorama = {
  panoramaUrl: string;
  previewUrl: string;
  width: number;
  height: number;
};

/** Draw `bitmap` at an exact size and encode it as JPEG.

    Prefers OffscreenCanvas (keeps a 4K resize off the layout path) and falls
    back to a detached <canvas>: Safari only shipped OffscreenCanvas in 16.4,
    and this is a phone-first audience. */
async function encodeAt(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get a 2D context");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      "image/jpeg",
      quality
    );
  });
}

/** Validate, downscale and upload one room.

    The source is whatever came off the camera — often 8000px wide, which is
    both slow to transfer and fatal to decode on a phone — so the stored
    panorama is capped and a 512×256 preview is produced in the same pass.
    Neither the original nor anything above the cap ever reaches the bucket.

    Throws PanoramaRejected when the file isn't a usable 360 photo; the
    uploader turns `reason` into an explanation. */
export async function uploadPanorama(
  file: File,
  userId: string
): Promise<UploadedPanorama> {
  if (!file.type.startsWith("image/")) throw new PanoramaRejected("not-image");

  // Decode once; both sizes are drawn from the same bitmap.
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new PanoramaRejected("not-image");

  try {
    const reason = rejectPanorama({
      type: file.type,
      bytes: file.size,
      width: bitmap.width,
      height: bitmap.height,
    });
    if (reason) throw new PanoramaRejected(reason);

    const target = panoramaTargetSize(bitmap.width, bitmap.height);
    const [full, preview] = await Promise.all([
      encodeAt(bitmap, target.width, target.height, 0.82),
      encodeAt(bitmap, PREVIEW_SIZE.width, PREVIEW_SIZE.height, 0.72),
    ]);

    const supabase = createClient();
    const bucket = supabase.storage.from(LISTING_PANORAMAS_BUCKET);
    const id = crypto.randomUUID();
    const path = `${userId}/${id}.jpg`;
    const previewPath = `${userId}/${id}-preview.jpg`;

    const [uploaded, uploadedPreview] = await Promise.all([
      bucket.upload(path, full, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      }),
      bucket.upload(previewPath, preview, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      }),
    ]);
    if (uploaded.error) {
      throw new Error(`Failed to upload panorama: ${uploaded.error.message}`);
    }
    if (uploadedPreview.error) {
      // The full panorama landed but its preview didn't: remove it rather
      // than leaving an object nothing references.
      void bucket.remove([path]);
      throw new Error(
        `Failed to upload panorama preview: ${uploadedPreview.error.message}`
      );
    }

    return {
      panoramaUrl: bucket.getPublicUrl(path).data.publicUrl,
      previewUrl: bucket.getPublicUrl(previewPath).data.publicUrl,
      width: target.width,
      height: target.height,
    };
  } finally {
    bitmap.close();
  }
}

/** Best-effort removal of a scene's objects when the owner deletes the room.
    Never throws: a leaked object costs storage, a thrown error costs the
    owner their edit. Paths outside this bucket (the seeded demo rooms live
    in /panoramas, served by the app) are skipped. */
export async function deletePanorama(...urls: (string | null | undefined)[]) {
  const supabase = createClient();
  const marker = `/${LISTING_PANORAMAS_BUCKET}/`;
  const paths = urls
    .filter((url): url is string => Boolean(url) && url!.includes(marker))
    .map((url) => url.slice(url.indexOf(marker) + marker.length));
  if (!paths.length) return;
  await supabase.storage.from(LISTING_PANORAMAS_BUCKET).remove(paths);
}
