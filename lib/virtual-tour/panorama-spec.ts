/* ============================================================
   What makes a file usable as a 360° room.

   Pure rules, kept apart from the upload itself (lib/supabase/storage.ts)
   because this is the part worth testing: the numbers here decide whether a
   renter's phone survives the tour, and getting them wrong fails in a way
   that only shows up on someone else's device.
   ============================================================ */

/** Hard cap on the stored panorama. Not cosmetic: an 8192×4096 texture
    decodes to ~128 MB of GPU memory and iOS Safari kills the tab rather than
    degrading (plan §5, §14.2). 4096×2048 is the largest size that survives a
    mid-range phone. */
export const MAX_PANORAMA = { width: 4096, height: 2048 } as const;

/** The small copy stored beside it: the room rail's thumbnail, and the first
    texture the viewer paints while the full one decodes. */
export const PREVIEW_SIZE = { width: 512, height: 256 } as const;

/** 20 MB — the `listing-panoramas` bucket's file_size_limit. Keep in sync
    with supabase/migrations/20260731120000_virtual_tours.sql. */
export const MAX_PANORAMA_BYTES = 20 * 1024 * 1024;

/** Below this a panorama is too soft to look around in — it reads as a
    blurry photo rather than a room. */
export const MIN_PANORAMA_WIDTH = 2048;

/** An equirectangular projection is exactly 2:1. Cameras and stitching apps
    are occasionally a pixel or two out, so the check has a tolerance rather
    than demanding the exact ratio. */
export const ASPECT_TOLERANCE = 0.02;

export type PanoramaRejection =
  | "not-image"
  | "not-equirectangular"
  | "too-small"
  | "too-large-file";

/** Is this 2:1 (within tolerance)? The single most common upload mistake is
    an ordinary photo, which this is what catches. */
export function isEquirectangular(
  width: number,
  height: number,
  tolerance: number = ASPECT_TOLERANCE
): boolean {
  if (width <= 0 || height <= 0) return false;
  return Math.abs(width / height - 2) <= tolerance * 2;
}

/** The size to store: capped at MAX_PANORAMA, never upscaled — enlarging a
    small panorama costs bytes and adds no detail. Keeps the 2:1 ratio. */
export function panoramaTargetSize(
  width: number,
  height: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { ...MAX_PANORAMA };
  if (width <= MAX_PANORAMA.width) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = MAX_PANORAMA.width / width;
  return {
    width: MAX_PANORAMA.width,
    height: Math.round(height * scale),
  };
}

/** Why a file can't be a room, or null when it can. `bytes` is checked
    against the bucket's own 20 MB limit so the rejection is ours (with an
    explanation) rather than a storage error. */
export function rejectPanorama(input: {
  type: string;
  bytes: number;
  width: number;
  height: number;
}): PanoramaRejection | null {
  if (!input.type.startsWith("image/")) return "not-image";
  if (input.bytes > MAX_PANORAMA_BYTES) return "too-large-file";
  if (!isEquirectangular(input.width, input.height)) return "not-equirectangular";
  if (input.width < MIN_PANORAMA_WIDTH) return "too-small";
  return null;
}
