/* Query keys shared by the auth hooks and the <Providers> auth listener. */
export const authKeys = {
  user: ["auth", "user"] as const,
  profile: ["profile"] as const,
};
