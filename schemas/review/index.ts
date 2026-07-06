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

/* The leave-a-review form. Built from a translator (scoped to the
   `validation` namespace) so the field messages are localized. */
export const createReviewFormSchema = (t: (key: string) => string) =>
  z.object({
    rating: z.number().min(1, t("review.rating")),
    author: z.string().min(1, t("name.required")),
    text: z.string().min(4, t("review.text")),
  });
export type ReviewFormValues = z.infer<
  ReturnType<typeof createReviewFormSchema>
>;
