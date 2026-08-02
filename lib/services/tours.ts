import "server-only";
import { createClient } from "@/lib/supabase/server";
import { type Listing } from "@/schemas/listing";
import { type BookTourInput, type TourRequest } from "@/schemas/tour";
import type { Tables } from "@/lib/database.types";
import { LISTING_SELECT, toListing } from "./listings-map";
import { getListingById } from "./listings";
import { toTourRequest } from "./tours-map";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Tours service — booking, and the two sides of managing a
   booking.

   Everything here is cookie-bound and uncached. RLS already
   limits `tours` to rows where the caller is the renter or the
   owner, so a stray id returns nothing rather than someone
   else's tour; each function additionally names *which* side it
   requires, because "renter or owner" isn't the same as "the
   owner may confirm" — without that, a renter could confirm
   their own request.

   The mutations take intents, not column patches. The hooks used
   to send a `TablesUpdate<"tours">` straight from the browser,
   which meant any signed-in party to a tour could set any column
   on it. What a client may now say is: accept, decline, propose
   this slot, take the proposed slot.
   ============================================================ */

type TourRow = Tables<"tours">;
type TourRowWithListing = TourRow & { listing: Tables<"listings"> | null };

export type TourWithListing = { tour: TourRequest; listing: Listing | null };

/** Which side of the tour the caller is acting as. */
export type TourScope = "renter" | "owner";

const scopeColumn = (scope: TourScope) =>
  scope === "renter" ? "renter_id" : "owner_id";

/* A renter may hold only ONE live tour per home. These statuses count as live;
   a declined / cancelled tour frees the home to be booked again. */
const ACTIVE_STATUS = ["pending", "confirmed", "reschedule"] as const;

/**
 * The caller's tours as renter or as owner, newest first, with the listing
 * joined in for the card.
 *
 * Scoping by side matters beyond RLS: an account that both rents and hosts
 * would otherwise see its own requests in the owner dashboard.
 */
export async function listTours(
  scope: TourScope
): Promise<TourWithListing[]> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select(`*, listing:listings(${LISTING_SELECT})`)
    .eq(scopeColumn(scope), user.id)
    .order("created_at", { ascending: false });

  if (error) throw new ServiceError("failed", error.message);
  return ((data ?? []) as TourRowWithListing[]).map((row) => ({
    tour: toTourRequest(row),
    listing: row.listing ? toListing(row.listing) : null,
  }));
}

/** The caller's current live tour for one listing, or null. */
export async function getActiveTour(
  listingId: string
): Promise<TourRequest | null> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("renter_id", user.id)
    .eq("listing_id", listingId)
    .in("status", [...ACTIVE_STATUS])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new ServiceError("failed", error.message);
  return data?.length ? toTourRequest(data[0]) : null;
}

/**
 * Every tour on `listingId` that both the caller and `otherUserId` are party
 * to — what a message thread may attach.
 *
 * RLS narrows the query to the caller's own tours; filtering to rows the other
 * member is also a party to leaves exactly the ones they share. An owner never
 * sees another renter's request, and a renter never sees a tour they aren't in.
 */
export async function listAttachableTours(
  listingId: string,
  otherUserId: string
): Promise<TourRequest[]> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? [])
    .filter(
      (row) => row.renter_id === otherUserId || row.owner_id === otherUserId
    )
    .map(toTourRequest);
}

/**
 * Book a tour for the caller.
 *
 * owner_id is deliberately not accepted from the client: the
 * set_tour_owner_id trigger derives it from the listing, so a tampered value
 * can't misdirect the request to another host.
 */
export async function bookTour(input: BookTourInput): Promise<TourRequest> {
  const user = await requireUser();
  assertNotPast(input.date);

  /* owner_id is NOT NULL, so the insert has to name one. Resolve it from the
     listing rather than take the client's word: getListingById reads through
     the anon client, which RLS limits to active listings, so this doubles as
     the "is this listing bookable?" check. The trigger still has the last
     word if the two ever disagree. */
  const listing = await getListingById(input.listingId);
  if (!listing) throw new ServiceError("not-found");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .insert({
      listing_id: input.listingId,
      owner_id: listing.owner,
      renter_id: user.id,
      renter_name: input.renterName,
      renter_email: input.renterEmail,
      date: input.date,
      time: input.time,
      move_in: input.moveIn || null,
      people: input.people || null,
      note: input.note ?? "",
    })
    .select()
    .single();

  if (error) {
    // 23505 = the one-active-tour-per-home unique index fired.
    if (error.code === "23505") throw new ServiceError("conflict");
    console.error("[tours] insert failed", error);
    throw new ServiceError("failed", error.message);
  }
  return toTourRequest(data);
}

/** Owner confirms the renter's requested slot. */
export async function acceptTour(id: string): Promise<string> {
  return writeTour(id, "owner", { status: "confirmed" });
}

/** Owner suggests an alternative slot; the renter then accepts or declines. */
export async function proposeTourTime(
  id: string,
  date: string,
  time: string
): Promise<string> {
  assertNotPast(date);
  return writeTour(id, "owner", {
    status: "reschedule",
    proposed_date: date,
    proposed_time: time,
  });
}

/**
 * Decline, from either side — the owner rejecting a request or cancelling a
 * confirmed tour, and the renter turning down a proposed slot or cancelling
 * their own booking. All land in the terminal "declined" state, which frees
 * the home to be booked again (the one-active-per-renter index excludes it).
 */
export async function declineTour(id: string): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .update({ status: "declined" })
    .eq("id", id)
    // Either side may decline, but a stranger may not. The uuid comes from the
    // verified session, never from the payload.
    .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
    .select("id");

  if (error) {
    console.error("[tours] decline failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
  return id;
}

/**
 * Renter adopts the owner's proposed slot as the real date and time.
 *
 * The new slot is read from the row rather than accepted as an argument —
 * otherwise a renter could "accept" any slot they liked, including one the
 * owner never offered.
 */
export async function acceptReschedule(id: string): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("tours")
    .select("status, proposed_date, proposed_time")
    .eq("id", id)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (readError) throw new ServiceError("failed", readError.message);
  if (!row) throw new ServiceError("not-found");
  if (row.status !== "reschedule" || !row.proposed_date || !row.proposed_time) {
    throw new ServiceError("invalid", "no proposed slot to accept");
  }

  return writeTour(id, "renter", {
    status: "confirmed",
    date: row.proposed_date,
    time: row.proposed_time,
    proposed_date: null,
    proposed_time: null,
  });
}

/** What provisioning a tour's message thread needs to know.

    Shaped for that caller rather than returned as a row: the chip fields are
    the ones denormalised onto the Stream channel, and nothing else about the
    tour belongs in another system. */
export type TourChatContext = {
  tour: TourRequest;
  renterId: string;
  ownerId: string;
  listingId: string;
  listing: Pick<Tables<"listings">, "id" | "title" | "price" | "images"> | null;
};

/**
 * The tour behind a chat thread, or null if the caller isn't party to it.
 *
 * RLS limits `tours` to the renter and the owner, so a foreign id simply
 * returns nothing — no extra ownership check needed here. Legacy rows booked
 * before accounts existed have no renter_id; without two real members there is
 * nobody to open a thread between, so those read as absent too.
 */
export async function getTourForChat(
  tourId: string
): Promise<TourChatContext | null> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*, listing:listings(id, title, price, images)")
    .eq("id", tourId)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  if (!data) return null;

  const row = data as TourRow & {
    listing: TourChatContext["listing"];
  };
  if (!row.renter_id) return null;

  return {
    tour: toTourRequest(row),
    renterId: row.renter_id,
    ownerId: row.owner_id,
    listingId: row.listing_id,
    listing: row.listing,
  };
}

/* One tour update, scoped to the side allowed to make it. A row that doesn't
   match reads as "not-found" rather than as a silent success, so the UI can't
   report a change that never happened. */
async function writeTour(
  id: string,
  scope: TourScope,
  patch: Partial<TourRow>
): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .update(patch)
    .eq("id", id)
    .eq(scopeColumn(scope), user.id)
    .select("id");

  if (error) {
    console.error("[tours] update failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
  return id;
}

/* The booking UI hides past slots, and this is the backstop it never had.
   Deliberately generous: it compares dates only and allows yesterday, because
   the server clock is UTC while renters are in UTC+7 — a strict "not before
   today" would reject a legitimate same-day booking for anyone west of it.
   Catching "months ago" is the point; policing the last 24 hours is not. */
function assertNotPast(date: string): void {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (date < yesterday) throw new ServiceError("invalid", "date is in the past");
}
