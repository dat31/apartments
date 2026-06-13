import { z } from "zod";

export const reviewFormSchema = z.object({
  rating: z.number().min(1, "Pick a rating from 1 to 5"),
  author: z.string().min(1, "Add your name"),
  text: z.string().min(4, "Tell us a little more"),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
