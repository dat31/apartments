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
   optional context for the owner. */
export const tourBookingSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  moveIn: z.string().optional(),
  people: z.string().optional(),
  note: z.string().optional(),
});
export type TourBookingValues = z.infer<typeof tourBookingSchema>;

/* Sign-in gate inside the book-tour flow. */
export const tourSignInSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type TourSignInValues = z.infer<typeof tourSignInSchema>;
