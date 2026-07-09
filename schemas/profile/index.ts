import { z } from "zod";

/* Zod-free shape + defaults live in ./constants — import from there in client
   code that doesn't validate, so zod stays out of those bundles. */
export { DEFAULT_PROFILE, type Profile, type Role } from "./constants";

/* The edit-profile form (a subset of the profile, with validation). */
export const manageProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  bio: z.string(),
  palette: z.number(),
});
export type ManageProfileValues = z.infer<typeof manageProfileSchema>;
