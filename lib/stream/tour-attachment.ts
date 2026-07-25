import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";

/* ============================================================
   Tour message attachment — the "attach a tour" affordance in the
   composer. A picked tour rides on the message as a custom Stream
   attachment (type `tour`), and the message bubble renders it as a
   tour card.

   Pure and browser-safe: no Stream imports, no secrets. Shared by the
   composer (staging), the staged-preview chip and the bubble renderer.
   ============================================================ */

/** Stream attachment `type` discriminant for a shared tour. */
export const TOUR_ATTACHMENT_TYPE = "tour";

/* The custom fields carried on the attachment. Snapshotted at send time,
   so the card keeps showing the slot/status the message was sent with even
   after the underlying tour is rescheduled or answered — mirroring how the
   design captures a tour into the message rather than live-binding it. */
export type TourAttachment = {
  type: typeof TOUR_ATTACHMENT_TYPE;
  tour_id: string;
  /** The listing the tour belongs to, so the card can be understood on its
      own if it is ever surfaced outside the thread. */
  listing_id?: string;
  tour_date: string; // YYYY-MM-DD (effective slot)
  tour_time: string; // HH:mm (effective slot)
  tour_status: TourRequest["status"];
  tour_note?: string;
};

/** Snapshot a tour into an attachment payload, keyed off the *effective*
    slot (tourSlot) so a rescheduled tour attaches the proposed time, not the
    superseded original. */
export function buildTourAttachment(tour: TourRequest): TourAttachment {
  const slot = tourSlot(tour);
  const note = tour.note.trim();
  return {
    type: TOUR_ATTACHMENT_TYPE,
    tour_id: tour.id,
    listing_id: tour.listingId,
    tour_date: slot.date,
    tour_time: slot.time,
    tour_status: tour.status,
    ...(note ? { tour_note: note } : {}),
  };
}

/** Narrow an arbitrary Stream attachment (or shared-location payload) to a
    tour attachment. Accepts `unknown` so it can sit in front of the SDK's
    `Attachment | SharedLocationResponse` union without a cast at each call. */
export function isTourAttachment(attachment: unknown): attachment is TourAttachment {
  if (!attachment || typeof attachment !== "object") return false;
  const candidate = attachment as { type?: unknown; tour_id?: unknown };
  return (
    candidate.type === TOUR_ATTACHMENT_TYPE && typeof candidate.tour_id === "string"
  );
}
