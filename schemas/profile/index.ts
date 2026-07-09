import { z } from "zod";

export const roleSchema = z.enum(["renter", "owner"]);
export type Role = z.infer<typeof roleSchema>;

/* The signed-in renter/owner profile persisted on the client. */
export const profileSchema = z.object({
  name: z.string(),
  email: z.string(),
  bio: z.string(),
  palette: z.number(),
  role: roleSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  bio: "",
  palette: 1,
  role: "renter",
};

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
