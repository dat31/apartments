import {
  parseYmd,
  todayYmd,
  tourSlot,
  ymd,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";

/* ============================================================
   Channel model — pure helpers shared by the server actions and
   the client islands. No Stream imports, no secrets: this module
   is safe in a browser bundle.
   ============================================================ */

/** Stream's built-in channel type. Used as-is — no CreateChannelType call. */
export const CHANNEL_TYPE = "messaging";

/* Channel ids accept [A-Za-z0-9_-] up to 64 chars. A tour uuid fits with the
   prefix (41 chars); listing threads need two ids, so they hash instead — see
   listingChannelId in lib/actions/listing-chat.ts. */
export const tourChannelId = (tourId: string) => `tour-${tourId}`;

/** Days a tour thread stays writable after its slot has passed. */
export const THREAD_GRACE_DAYS = 7;

/** Chat tokens expire; an unbounded one can't be revoked short of rotating
    the app secret. The client refetches through its token provider. */
export const STREAM_TOKEN_TTL_SECONDS = 2 * 60 * 60;

/** The last day a tour's thread accepts messages (grace period included).
    Keyed off the *effective* slot, so a reschedule moves the deadline. */
export function threadClosesOn(tour: TourRequest): string {
  const closes = parseYmd(tourSlot(tour).date);
  closes.setDate(closes.getDate() + THREAD_GRACE_DAYS);
  return ymd(closes);
}

/** Whether a tour thread should be frozen: immediately once declined,
    otherwise after the grace period runs out. The server action is the one
    that acts on this — clients read `channel.data.frozen`. */
export function isThreadClosed(tour: TourRequest): boolean {
  if (tour.status === "declined") return true;
  return todayYmd() > threadClosesOn(tour);
}
