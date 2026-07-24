"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  listingChip,
  streamServer,
  streamUserSeeds,
  upsertStreamUsers,
} from "@/lib/stream/server";
import { CHANNEL_TYPE } from "@/lib/stream/channel";

/* ============================================================
   Listing thread provisioning — the "Message owner" entry point.

   One open-ended thread per (listing, renter) pair. Channel ids accept
   [A-Za-z0-9_-] up to 64 chars and two concatenated uuids don't fit (72), so
   the pair is hashed. Nothing reverses the hash: consumers read `listing_id`
   off the channel's custom data.
   ============================================================ */

export type ListingChatResult =
  | { ok: true; channelId: string }
  | {
      ok: false;
      error: "unauthenticated" | "not-found" | "own-listing" | "unavailable";
    };

const listingChannelId = (listingId: string, renterId: string) =>
  `listing-${createHash("sha256")
    .update(`${listingId}:${renterId}`)
    .digest("hex")
    .slice(0, 40)}`;

export async function ensureListingChannel(
  listingId: string
): Promise<ListingChatResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, owner_id, price, images")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) return { ok: false, error: "not-found" };

  // An owner messaging themselves has no second party; the button is hidden
  // on their own listing, and this is the server-side backstop.
  if (listing.owner_id === user.id) return { ok: false, error: "own-listing" };

  const channelId = listingChannelId(listing.id, user.id);

  try {
    const seeds = await streamUserSeeds(supabase, [user.id, listing.owner_id]);
    await upsertStreamUsers(seeds);

    const chip = listingChip(listing);
    const channel = streamServer().channel(CHANNEL_TYPE, channelId, {
      members: [user.id, listing.owner_id],
      created_by_id: user.id,
      listing_id: listing.id,
      ...chip,
    });
    await channel.create();

    /* Channel data set at creation is not re-applied to an existing channel,
       so the header chip would keep an edited listing's old title or price.
       updatePartial only — a full update() replaces custom data. */
    const current = channel.data;
    const drift = Object.fromEntries(
      Object.entries(chip).filter(
        ([key, value]) => current?.[key as keyof typeof current] !== value
      )
    );
    if (Object.keys(drift).length > 0) {
      await channel.updatePartial({ set: drift });
    }

    return { ok: true, channelId };
  } catch (streamError) {
    console.error("[stream] ensureListingChannel failed", streamError);
    return { ok: false, error: "unavailable" };
  }
}
