import "server-only";
import { StreamChat } from "stream-chat";
import type { Tables } from "@/lib/database.types";
import type { ProfileSeed } from "@/lib/services/profiles";

/* ============================================================
   Server-side Stream client. The API secret lives here and never
   reaches a client bundle — "server-only" makes an accidental
   import from a client component a build error.
   ============================================================ */

/** getInstance() is a singleton, which is fine server-side (the strict-mode
    double-connect hazard is browser-only — the client uses
    useCreateChatClient instead). */
export function streamServer(): StreamChat {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Stream is not configured — NEXT_PUBLIC_STREAM_API_KEY / STREAM_API_SECRET missing"
    );
  }
  return StreamChat.getInstance(apiKey, apiSecret);
}

/* The listing fields the thread header's chip renders. Denormalised onto the
   channel so opening a thread costs no listings query; both provisioning
   actions rewrite them on every call, so an edited title or price catches up
   the next time either party opens the conversation. */
export function listingChip(
  listing: Pick<Tables<"listings">, "title" | "price" | "images"> | null
) {
  return {
    listing_title: listing?.title ?? "",
    listing_price: listing?.price ?? 0,
    listing_image: listing?.images?.[0] ?? "",
  };
}

/* A Stream user record is exactly a profile's display identity, so the seed
   is the profiles DTO rather than a parallel shape. Read it with
   getProfileSeeds() from @/lib/services/profiles — the Supabase query lives
   there, not here. */
export type StreamUserSeed = ProfileSeed;

/** Upsert Stream user records. Never writes `role`: sending `role: "user"` on
    every call would silently demote anyone promoted in the Stream dashboard. */
export async function upsertStreamUsers(seeds: StreamUserSeed[]): Promise<void> {
  if (seeds.length === 0) return;
  await streamServer().upsertUsers(
    seeds.map(({ id, name, palette, verified }) => ({
      id,
      name,
      palette,
      verified,
    }))
  );
}
