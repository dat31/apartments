import type { Tables } from "@/lib/database.types";
import { type TourRequest } from "@/schemas/tour";
import { OWNER_KEY_BY_ID } from "./listings-map";

/* Pure row → domain mapping for `tours`, split out so it can run in the
   browser (the renter booking flow and the my-tours page read straight from
   the client Supabase client). No `server-only`, no cache, no React.

   Owner ids are mapped back to their "you"/"maya"/"leo" keys (mirroring
   listings-map) so the rest of the app keeps addressing owners by key. */

type TourRow = Tables<"tours">;

/* Postgres `time` columns come back as "HH:mm:ss"; the app works in "HH:mm". */
const hhmm = (t: string | null): string | undefined =>
  t ? t.slice(0, 5) : undefined;

/** Map a Supabase `tours` row to the app's domain `TourRequest`. */
export function toTourRequest(row: TourRow): TourRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    ownerKey: OWNER_KEY_BY_ID[row.owner_id] ?? row.owner_id,
    date: row.date,
    time: hhmm(row.time) ?? row.time,
    note: row.note ?? "",
    moveIn: row.move_in ?? undefined,
    people: row.people ?? undefined,
    renterName: row.renter_name,
    renterEmail: row.renter_email,
    status: row.status,
    proposedDate: row.proposed_date ?? undefined,
    proposedTime: hhmm(row.proposed_time),
    createdAt: Date.parse(row.created_at),
  };
}
