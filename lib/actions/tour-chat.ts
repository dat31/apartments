"use server";

import {
  listingChip,
  streamServer,
  upsertStreamUsers,
} from "@/lib/stream/server";
import { getProfileSeeds } from "@/lib/services/profiles";
import { getTourForChat } from "@/lib/services/tours";
import { getSessionUser } from "@/lib/services/session";
import {
  CHANNEL_TYPE,
  isThreadClosed,
  tourChannelId,
} from "@/lib/stream/channel";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* ============================================================
   Tour thread provisioning.

   Supabase stays the authority on who may talk to whom: the tour row is read
   through the caller's RLS-scoped client (which already restricts `tours` to
   the two parties), and only then is channel membership set. Stream never
   learns what a tour is.

   Idempotent and safe to call on every open — booking calls it once, and the
   tour card calls it again lazily for tours booked before this shipped.
   ============================================================ */

export type TourChatResult =
  | { ok: true; channelId: string; closed: boolean }
  | { ok: false; error: "unauthenticated" | "not-found" | "unavailable" };

export async function ensureTourChannel(tourId: string): Promise<TourChatResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const context = await getTourForChat(tourId).catch(() => null);
  if (!context) return { ok: false, error: "not-found" };

  const { tour, renterId, ownerId, listingId, listing } = context;
  const slot = tourSlot(tour);
  const closed = isThreadClosed(tour);
  const channelId = tourChannelId(tour.id);

  try {
    const seeds = await getProfileSeeds([renterId, ownerId]);
    await upsertStreamUsers(seeds);

    const channel = streamServer().channel(CHANNEL_TYPE, channelId, {
      members: [renterId, ownerId],
      created_by_id: renterId,
      tour_id: tour.id,
      listing_id: listingId,
      ...listingChip(listing),
      tour_date: slot.date,
      tour_time: slot.time,
    });
    await channel.create();

    await seedBookingNote(channel, channelId, tour.note, renterId);

    /* Channel data set at creation is not re-applied to an existing channel,
       so drift (a rescheduled slot, an expired grace period) is reconciled
       here. Always updatePartial — a full update() *replaces* custom data and
       would wipe the listing/tour context this thread renders from. */
    const current = channel.data;
    const desired = {
      frozen: closed,
      tour_date: slot.date,
      tour_time: slot.time,
      ...listingChip(listing),
    };
    const drift = Object.fromEntries(
      Object.entries(desired).filter(
        ([key, value]) => current?.[key as keyof typeof current] !== value
      )
    );
    if (Object.keys(drift).length > 0) {
      await channel.updatePartial({ set: drift });
    }

    return { ok: true, channelId, closed };
  } catch (streamError) {
    console.error("[stream] ensureTourChannel failed", streamError);
    return { ok: false, error: "unavailable" };
  }
}

/* The booking note becomes the thread's first message, sent as the renter.
   The message id is derived from the channel id: booking and panel-open can
   race, and a "seed only if empty" check is check-then-act — a fixed id makes
   the loser of the race a rejected duplicate instead of a second note. */
async function seedBookingNote(
  channel: ReturnType<ReturnType<typeof streamServer>["channel"]>,
  channelId: string,
  note: string,
  renterId: string
): Promise<void> {
  const text = note.trim();
  if (!text) return;
  try {
    await channel.sendMessage({
      id: `${channelId}-note`,
      text,
      user_id: renterId,
    });
  } catch {
    // Already seeded (duplicate id) — the expected outcome on every call
    // after the first.
  }
}
