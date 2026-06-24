import { z } from "zod";

/* A published review of an owner. Seed data lives in @/lib/data/listings. */
export const ReviewSchema = z.object({
  id: z.string(),
  owner: z.string(),
  author: z.string(),
  initials: z.string(),
  rating: z.number(),
  date: z.string(),
  stay: z.string().optional(),
  text: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

/* The leave-a-review form. */
export const reviewFormSchema = z.object({
  rating: z.number().min(1, "Pick a rating from 1 to 5"),
  author: z.string().min(1, "Add your name"),
  text: z.string().min(4, "Tell us a little more"),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
