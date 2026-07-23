/* Messaging plumbing — pure, client-safe, no Stream calls.

   Two kinds of conversation share one Stream channel type:

   • **Tour threads** (`tour-<tourId>`), anchored to a booked viewing. The
     tour is their permission model and they expire — see isThreadClosed.
   • **Listing threads**, opened from a listing's "Message owner". Their id is
     derived server-side in lib/actions/listing-chat.ts (it needs a hash to
     stay inside Stream's 64-char id limit) and they do not expire.

   Only the tour helpers live here, because only they are needed in the
   browser. See docs/improvements/12-renter-owner-messaging.md. */

import { type TourRequest } from "@/schemas/tour";
import {
  parseYmd,
  todayYmd,
  tourSlot,
  ymd,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Stream's built-in `messaging` channel type — 1:1 conversations with uploads
   and reactions already enabled, so no channel-type setup is required. */
export const CHANNEL_TYPE = "messaging";

/* Stream channel ids accept [A-Za-z0-9_-] up to 64 chars. Tour ids are uuids,
   so `tour-<uuid>` is 41 chars and always legal. */
export const tourChannelId = (tourId: string) => `tour-${tourId}`;

/* How long a thread stays writable after the tour slot passes. #12 step 6:
   threads close "some period after the tour date passes" so they don't become
   indefinite open DMs. */
export const THREAD_GRACE_DAYS = 7;

/** The date (YYYY-MM-DD) after which the thread stops accepting messages. */
export function threadClosesOn(tour: TourRequest): string {
  const close = parseYmd(tourSlot(tour).date);
  close.setDate(close.getDate() + THREAD_GRACE_DAYS);
  return ymd(close);
}

/* How long a minted chat token stays valid. Short enough that a leaked token
   stops working on its own; the client holds a token *provider* rather than a
   fixed string (see chat-provider.tsx), so expiry costs a silent refetch
   instead of a dropped connection. */
export const STREAM_TOKEN_TTL_SECONDS = 2 * 60 * 60;

/* A declined tour closes its thread at once — there is no appointment left to
   talk about. Otherwise it stays open until the grace window elapses.
   Compared as YYYY-MM-DD strings against the Da Nang wall clock, matching the
   rest of the tour scheduling logic (todayYmd), so a renter in another
   timezone sees the same cutoff as the owner. */
export function isThreadClosed(tour: TourRequest): boolean {
  if (tour.status === "declined") return true;
  return todayYmd() > threadClosesOn(tour);
}
