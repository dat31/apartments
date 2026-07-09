import { z } from "zod";

/* Owner (host) profile. Seed data lives in @/lib/data/listings (OWNERS). */
export const OwnerSchema = z.object({
  key: z.string(),
  name: z.string(),
  palette: z.number(),
  joined: z.string(),
  verified: z.boolean(),
  superhost: z.boolean(),
  responseRate: z.number(),
  responseTime: z.string(),
  languages: z.array(z.string()),
  bio: z.string(),
});
export type Owner = z.infer<typeof OwnerSchema>;
