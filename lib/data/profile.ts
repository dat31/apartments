import { z } from "zod";

export const roleSchema = z.enum(["renter", "owner"]);
export type Role = z.infer<typeof roleSchema>;

export const profileSchema = z.object({
  name: z.string(),
  email: z.string(),
  location: z.string(),
  bio: z.string(),
  palette: z.number(),
  role: roleSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  location: "Da Nang",
  bio: "",
  palette: 1,
  role: "renter",
};

export const manageProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  location: z.string(),
  bio: z.string(),
  palette: z.number(),
});
export type ManageProfileValues = z.infer<typeof manageProfileSchema>;

export const acctInitials = (name: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";
