import { z } from "zod";

/* A scheduled apartment-viewing request. */
export const tourRequestSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  ownerKey: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:mm
  note: z.string(),
  // Optional booking details the renter can share when requesting a tour.
  moveIn: z.string().optional(), // YYYY-MM-DD
  people: z.string().optional(), // "1" | "2" | … | "5+"
  renterName: z.string(),
  renterEmail: z.string(),
  status: z.enum(["pending", "confirmed", "declined", "reschedule"]),
  // Set when the owner suggests an alternative slot (status "reschedule").
  proposedDate: z.string().optional(),
  proposedTime: z.string().optional(),
  createdAt: z.number(),
});
export type TourRequest = z.infer<typeof tourRequestSchema>;

/* What a client may send to book a tour — the shape the action re-validates.
   Static (not translated) because it guards the trust boundary, not a form:
   the localized field messages come from createTourBookingSchema below.

   Note what is absent. The renter is the session, and the owner is derived
   from the listing by the set_tour_owner_id trigger, so neither is forgeable
   here. */
export const bookTourSchema = z.object({
  listingId: z.string(),
  date: z.string().min(1), // YYYY-MM-DD
  time: z.string().min(1), // HH:mm
  moveIn: z.string().optional(),
  people: z.string().optional(),
  note: z.string().optional(),
  renterName: z.string(),
  renterEmail: z.string(),
});
export type BookTourInput = z.infer<typeof bookTourSchema>;

/* An owner's alternative slot. */
export const proposeSlotSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
});

/* ---- owner tour availability ----
   The weekly template an owner offers, and one slot within it. Guards the
   availability actions: weekday is 0=Sun..6=Sat (matching JS Date#getDay and
   the WeekTemplate keys) and times are "HH:mm", so neither a bad weekday nor a
   free-text time reaches the `owner_availability` insert. */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const availabilitySlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  time: hhmm,
  /** Whether the slot is currently on — the toggle removes it if so. */
  active: z.boolean(),
});
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

/* Object keys arrive as strings over the wire, hence the string weekday. */
export const weekTemplateSchema = z.record(
  z.string().regex(/^[0-6]$/),
  z.array(hhmm)
);

/* The renter's tour selection — date and time are required, the rest is
   optional context for the owner. Built from a translator (scoped to the
   `validation` namespace) so the field messages are localized. */
export const createTourBookingSchema = (t: (key: string) => string) =>
  z.object({
    date: z.string().min(1, t("tour.date")),
    time: z.string().min(1, t("tour.time")),
    moveIn: z.string().optional(),
    people: z.string().optional(),
    note: z.string().optional(),
  });
export type TourBookingValues = z.infer<
  ReturnType<typeof createTourBookingSchema>
>;

/* Sign-in gate inside the book-tour flow. */
export const createTourSignInSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(2, t("name.required")),
    email: z.string().trim().min(1, t("email.required")).email(t("email.invalid")),
    password: z.string().min(1, t("password.required")),
  });
export type TourSignInValues = z.infer<
  ReturnType<typeof createTourSignInSchema>
>;
