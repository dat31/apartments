import { z } from "zod";

/* A published review of an owner, sourced from the `reviews` table
   (see @/lib/services/reviews). */
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
   `validation` namespace) so the field messages are localized.

   No author field: the `reviews` table keys the writer by `author_id`, and
   RLS (`reviews_insert_author`) requires it to be the signed-in user — the
   display name is joined from their profile. */
export const createReviewFormSchema = (t: (key: string) => string) =>
  z.object({
    rating: z.number().min(1, t("review.rating")),
    text: z.string().min(4, t("review.text")),
  });
export type ReviewFormValues = z.infer<
  ReturnType<typeof createReviewFormSchema>
>;

/* The server action's payload — revalidated on the server since Server
   Actions are public endpoints and the client schema can't be trusted. */
export const ReviewInputSchema = z.object({
  // guid, not uuid: the demo profile ids ("1111…") don't carry RFC-4122
  // version and variant bits, and a shape check is all these need.
  ownerId: z.guid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(4).max(2000),
  listingId: z.guid().optional(),
});
export type ReviewInput = z.infer<typeof ReviewInputSchema>;
