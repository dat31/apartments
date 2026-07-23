"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { streamServerClient } from "@/lib/stream/server";
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import "@/lib/stream/custom-data";

/* Opens the conversation between a renter and a listing's owner.

   Unlike tour threads, this one has no appointment behind it — any signed-in
   renter can start it from a listing page. That is a deliberately wider door
   than docs/improvements/12-renter-owner-messaging.md proposed (it argued for
   tour-anchored threads precisely to bound cold contact), chosen to match the
   design's "Message owner" flow. The containment that remains: you must be
   signed in, the thread is scoped to one listing, and the owner is a real
   member who can be muted/blocked through Stream if it is ever abused.

   One thread per (listing, renter) pair, so a renter asking about two
   apartments gets two conversations rather than one muddled one. */

export type EnsureListingChannelResult =
  | { ok: true; channelId: string }
  | {
      ok: false;
      error: "unauthenticated" | "not-found" | "own-listing";
    };

/* Stream channel ids are capped at 64 chars and restricted to [A-Za-z0-9_-],
   so two concatenated uuids (72 chars) do not fit. A truncated SHA-256 of the
   pair is stable, collision-free in practice, and legal. Nothing needs to
   reverse it — the id is returned to the caller, and anything that needs to
   know which listing a channel belongs to reads `listing_id` off the channel's
   custom data instead. */
function listingChannelId(listingId: string, renterId: string): string {
  const digest = createHash("sha256")
    .update(`${listingId}:${renterId}`)
    .digest("hex");
  return `listing-${digest.slice(0, 40)}`;
}

export async function ensureListingChannel(
  listingId: string
): Promise<EnsureListingChannelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, owner_id, price, images, palette")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) return { ok: false, error: "not-found" };

  // An owner viewing their own listing has nobody to message.
  if (listing.owner_id === user.id) return { ok: false, error: "own-listing" };

  const renterId = user.id;
  const ownerId = listing.owner_id;
  const channelId = listingChannelId(listing.id, renterId);
  const client = streamServerClient();

  /* Both participants must exist as Stream users before they can be members.
     These are the two real people on this conversation — not seeded demo
     accounts. */
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, palette")
    .in("id", [renterId, ownerId]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const renterName =
    profileById.get(renterId)?.name ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Renter";

  /* No `role`: upsertUsers overwrites the fields it is given, so asserting
     "user" here would demote anyone an operator promoted in the Stream
     dashboard, on their next visit. Stream defaults a new user to `user`
     anyway — this only ever needs to carry name and palette. */
  await client.upsertUsers([
    {
      id: renterId,
      name: renterName,
      palette: profileById.get(renterId)?.palette ?? undefined,
    },
    {
      id: ownerId,
      name: profileById.get(ownerId)?.name || "Owner",
      palette: profileById.get(ownerId)?.palette ?? undefined,
    },
  ]);

  const channel = client.channel(CHANNEL_TYPE, channelId, {
    members: [renterId, ownerId],
    /* Server-side creation has no ambient user, so Stream requires a creator.
       The renter, because they are the one opening this conversation:
       `created_by_id` is what Stream resolves owner-scoped grants against, so
       naming the owner here would hand them creator authority over a thread
       they did not start (and leave the renter with none over their own). */
    created_by_id: renterId,
    listing_id: listing.id,
    listing_title: listing.title,
    listing_price: listing.price,
    listing_image: listing.images?.[0],
    listing_palette: listing.palette,
  });
  await channel.create();

  return { ok: true, channelId };
}
