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
