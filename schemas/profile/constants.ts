/* Profile shape + defaults, kept zod-free: client components that only need
   these (e.g. the landing page via useProfile) must not pull zod into their
   bundle. Validation schemas live in ./index.ts. */

export type Role = "renter" | "owner";

export type Profile = {
  name: string;
  email: string;
  bio: string;
  palette: number;
  role: Role;
};

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  bio: "",
  palette: 1,
  role: "renter",
};
