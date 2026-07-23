"use server";

import { createClient } from "@/lib/supabase/server";
import { streamServerClient } from "@/lib/stream/server";
import { toTourRequest } from "@/lib/services/tours-map";
import {
  CHANNEL_TYPE,
  isThreadClosed,
  tourChannelId,
} from "@/lib/stream/channel";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import "@/lib/stream/custom-data";

/* Provisions the Stream channel for one tour and returns its id.

   This is the whole permission model. `tours` stays the authority on who may
   talk to whom, so membership is derived here from the row rather than from
   anything the client sends — Stream never learns what a tour is. RLS already
   restricts `tours` to rows where the caller is the renter or the owner, so a
   successful read *is* the authorization check; the explicit id comparison
   below is a second belt in case that policy is ever loosened.

   Server Actions are public HTTP endpoints, hence the session check first.

   Idempotent — safe to call every time a thread is opened. */

export type EnsureTourChannelResult =
  | { ok: true; channelId: string; closed: boolean }
  | { ok: false; error: "unauthenticated" | "not-found" | "forbidden" };

export async function ensureTourChannel(
  tourId: string
): Promise<EnsureTourChannelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: row, error } = await supabase
    .from("tours")
    .select("*, listing:listings(title, price, images, palette)")
    .eq("id", tourId)
    .maybeSingle();
  if (error || !row) return { ok: false, error: "not-found" };

  const renterId = row.renter_id;
  const ownerId = row.owner_id;
  // Tours booked before renter_id existed have no renter account to talk to.
  if (!renterId) return { ok: false, error: "not-found" };
  if (user.id !== renterId && user.id !== ownerId) {
    return { ok: false, error: "forbidden" };
  }

  const tour = toTourRequest(row);
  const closed = isThreadClosed(tour);
  const channelId = tourChannelId(tourId);
  const client = streamServerClient();

  /* Both participants must exist as Stream users before they can be members.
     These are the two real people on this tour — not seeded demo accounts. */
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, palette")
    .in("id", [renterId, ownerId]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  /* No `role`: upsertUsers overwrites the fields it is given, so asserting
     "user" here would demote anyone an operator promoted in the Stream
     dashboard, on their next visit. Stream defaults a new user to `user`
     anyway — this only ever needs to carry name and palette. */
  await client.upsertUsers([
    {
      id: renterId,
      name: profileById.get(renterId)?.name || row.renter_name || "Renter",
      palette: profileById.get(renterId)?.palette ?? undefined,
    },
    {
      id: ownerId,
      name: profileById.get(ownerId)?.name || "Owner",
      palette: profileById.get(ownerId)?.palette ?? undefined,
    },
  ]);

  /* The joined listing, for the header's chip. Optional throughout: a tour
     whose listing has since been deleted still has a thread worth reading. */
  const listing = (
    row as {
      listing?: {
        title: string;
        price: number;
        images: string[] | null;
        palette: number;
      } | null;
    }
  ).listing;

  /* The *effective* slot, not the originally requested one: once the owner has
     proposed a new time, that is the appointment both sides are talking about,
     and it is what isThreadClosed above measures the grace window from. */
  const slot = tourSlot(tour);

  const channel = client.channel(CHANNEL_TYPE, channelId, {
    members: [renterId, ownerId],
    // Server-side creation has no ambient user, so Stream requires a creator.
    created_by_id: ownerId,
    tour_id: tourId,
    listing_id: row.listing_id,
    listing_title: listing?.title,
    listing_price: listing?.price,
    listing_image: listing?.images?.[0],
    listing_palette: listing?.palette,
    tour_date: slot.date,
    tour_time: slot.time,
  });

  const created = await channel.create();

  /* #12 step 1: the renter's booking note becomes the thread's first message,
     so the feature retrofits onto tours that already exist.

     The empty-channel check is the cheap path, not the guarantee: both sides
     can open the thread at the same moment, both read a channel with no
     messages, and both send. The message id is what actually makes this
     idempotent — it is derived from the channel, so the second send collides
     with the first and Stream rejects it instead of posting the note twice.
     Any other send failure is swallowed for the same reason the note is
     best-effort: the thread itself is provisioned either way. */
  if (created.messages.length === 0 && tour.note.trim()) {
    await channel
      .sendMessage({
        id: `${channelId}-note`,
        text: tour.note.trim(),
        user_id: renterId,
      })
      .catch(() => undefined);
  }

  /* Freeze/unfreeze is evaluated on every open rather than by a scheduled job:
     a frozen channel still reads fine, it just refuses new messages, which is
     exactly the read-only state #12 step 6 asks for. */
  if (Boolean(created.channel.frozen) !== closed) {
    await channel.updatePartial({ set: { frozen: closed } });
  }

  return { ok: true, channelId, closed };
}
