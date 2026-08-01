import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ServiceError } from "./errors";

/* ============================================================
   Who is calling — resolved once per request, in one place.

   Server Actions are public HTTP endpoints and a page-level guard
   does not extend to them, so every service that touches per-user
   data starts here rather than trusting an id from the payload.
   The middleware's PROTECTED list decides which *pages* render;
   this decides what data anyone gets.

   getUser() and never getSession(): only the former verifies the
   token against the auth server (see lib/supabase/middleware.ts).

   React's cache() memoizes for the current request, so the half
   dozen services a single action may touch share one round trip.
   Note it does NOT reach inside a "use cache" boundary — cached
   functions get their arguments passed in instead, which is
   correct: nothing cookie-bound belongs in a cache entry.
   ============================================================ */

export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The caller, or a refusal the action layer renders as
    `{ ok: false, error: "unauthenticated" }`. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ServiceError("unauthenticated");
  return user;
}
