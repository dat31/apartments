"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listingChip,
  streamServer,
  streamUserSeeds,
  upsertStreamUsers,
} from "@/lib/stream/server";
import {
  CHANNEL_TYPE,
  isThreadClosed,
  tourChannelId,
} from "@/lib/stream/channel";
import { toTourRequest } from "@/lib/services/tours-map";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import type { Tables } from "@/lib/database.types";

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

type TourWithListing = Tables<"tours"> & {
  listing: Pick<Tables<"listings">, "id" | "title" | "price" | "images"> | null;
};

export async function ensureTourChannel(tourId: string): Promise<TourChatResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // RLS limits `tours` to the renter and the owner, so a foreign id simply
  // returns nothing — no extra ownership check needed here.
  const { data, error } = await supabase
    .from("tours")
    .select("*, listing:listings(id, title, price, images)")
    .eq("id", tourId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "not-found" };

  const row = data as TourWithListing;
  // Legacy rows booked before accounts existed have no renter_id; without two
  // real members there is nobody to open a thread between.
  if (!row.renter_id) return { ok: false, error: "not-found" };

  const tour = toTourRequest(row);
  const slot = tourSlot(tour);
  const closed = isThreadClosed(tour);
  const channelId = tourChannelId(row.id);

  try {
    const seeds = await streamUserSeeds(supabase, [row.renter_id, row.owner_id]);
    await upsertStreamUsers(seeds);

    const channel = streamServer().channel(CHANNEL_TYPE, channelId, {
      members: [row.renter_id, row.owner_id],
      created_by_id: row.renter_id,
      tour_id: row.id,
      listing_id: row.listing_id,
      ...listingChip(row.listing),
      tour_date: slot.date,
      tour_time: slot.time,
    });
    await channel.create();

    await seedBookingNote(channel, channelId, row.note, row.renter_id);

    /* Channel data set at creation is not re-applied to an existing channel,
       so drift (a rescheduled slot, an expired grace period) is reconciled
       here. Always updatePartial — a full update() *replaces* custom data and
       would wipe the listing/tour context this thread renders from. */
    const current = channel.data;
    const desired = {
      frozen: closed,
      tour_date: slot.date,
      tour_time: slot.time,
      ...listingChip(row.listing),
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
