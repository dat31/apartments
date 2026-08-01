import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { toAvailabilityRows, toWeekTemplate } from "./availability-map";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Owner tour-availability — one row per available (weekday,
   time) slot in `owner_availability`.

   Reads are public: a renter has to see a host's open slots to
   book one, and RLS exposes them to anon. So the read is a
   cached, cookieless one like the rest of the public surface.

   Writes are the signed-in owner's own, and the owner is the
   session — there is no ownerId parameter below that would let
   one host edit another's week.
   ============================================================ */

export const availabilityTag = (ownerId: string) => `availability:${ownerId}`;

/** One owner's weekly template. Public. */
export async function getAvailability(ownerId: string): Promise<WeekTemplate> {
  "use cache";
  cacheLife("hours");
  cacheTag(availabilityTag(ownerId));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("owner_availability")
    .select("*")
    .eq("owner_id", ownerId);

  if (error) throw new ServiceError("failed", error.message);
  return toWeekTemplate(data ?? []);
}

/**
 * Add or remove one slot in the caller's own week. `active` describes the
 * slot's current state, so a true value removes it.
 */
export async function toggleMySlot(
  weekday: number,
  time: string,
  active: boolean
): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { error } = active
    ? await supabase
        .from("owner_availability")
        .delete()
        .match({ owner_id: user.id, weekday, time })
    : await supabase
        .from("owner_availability")
        .insert({ owner_id: user.id, weekday, time });

  if (error) {
    console.error("[availability] toggle failed", error);
    throw new ServiceError("failed", error.message);
  }
  return user.id;
}

/**
 * Replace the caller's whole week (the editor's presets).
 *
 * One transactional RPC rather than delete-then-insert: a client-side pair
 * could wipe an owner's entire week if the insert failed after the delete
 * committed. The RPC derives the owner from auth.uid(), so the rows carry no
 * owner_id here.
 */
export async function replaceMyWeek(next: WeekTemplate): Promise<string> {
  const user = await requireUser();

  const slots = toAvailabilityRows(user.id, next).map(({ weekday, time }) => ({
    weekday,
    time,
  }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_owner_availability", { slots });

  if (error) {
    console.error("[availability] replace failed", error);
    throw new ServiceError("failed", error.message);
  }
  return user.id;
}
