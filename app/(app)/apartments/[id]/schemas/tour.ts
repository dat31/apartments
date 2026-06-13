import { z } from "zod";

/* A scheduled apartment-viewing request. */
export const tourRequestSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  ownerKey: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:mm
  note: z.string(),
  renterName: z.string(),
  renterEmail: z.string(),
  status: z.enum(["pending", "confirmed", "declined"]),
  createdAt: z.number(),
});
export type TourRequest = z.infer<typeof tourRequestSchema>;

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
