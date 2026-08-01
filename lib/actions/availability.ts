"use server";

import { updateTag } from "next/cache";
import {
  availabilitySlotSchema,
  weekTemplateSchema,
  type AvailabilitySlot,
} from "@/schemas/tour";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import {
  availabilityTag,
  getAvailability,
  replaceMyWeek,
  toggleMySlot,
} from "@/lib/services/availability";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Owner-availability entry points.

   The read is cached per owner, so both writes expire that
   owner's tag — otherwise a host could toggle a slot and still
   see the old week (and, worse, renters would keep booking it)
   until the cacheLife expired.
   ============================================================ */

/** One owner's weekly template. Public. */
export async function fetchAvailability(
  ownerId: string
): Promise<ActionResult<WeekTemplate>> {
  return toResult(() => getAvailability(ownerId));
}

/** Add or remove one slot in the caller's own week. */
export async function toggleMySlotAction(
  slot: AvailabilitySlot
): Promise<ActionResult> {
  const parsed = availabilitySlotSchema.safeParse(slot);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { weekday, time, active } = parsed.data;
  const result = await toResult(() => toggleMySlot(weekday, time, active));
  if (!result.ok) return result;

  updateTag(availabilityTag(result.data));
  return { ok: true, data: undefined };
}

/** Replace the caller's whole week. */
export async function replaceMyWeekAction(
  next: WeekTemplate
): Promise<ActionResult> {
  const parsed = weekTemplateSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await toResult(() => replaceMyWeek(parsed.data));
  if (!result.ok) return result;

  updateTag(availabilityTag(result.data));
  return { ok: true, data: undefined };
}
