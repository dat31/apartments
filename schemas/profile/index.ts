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

/* What a user may change about their own profile, as sent to the save action.
   Partial because callers patch rather than replace: the role cards send
   { role, name }, the manage dialog sends the whole form. `email` is accepted
   and then dropped — it belongs to the auth user, not the profiles row. */
export const profilePatchSchema = profileSchema.partial();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

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
