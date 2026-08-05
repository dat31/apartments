import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* Service-role Supabase client — bypasses RLS entirely.

   Exactly one caller: the admin section of lib/services/notifications.ts,
   which the saved-search cron uses. That job is cross-user by nature (it reads
   every alerting renter's saved searches and writes into their feeds), so
   there is no session it could run as; RLS has nothing to scope it to.

   `server-only` on line 1 is the guard that matters: importing this from
   anything that reaches the browser is a build error, not a leak. Everything
   else in the app belongs on ./server (per-user, cookie-bound) or ./public
   (anon-readable, cacheable) — reach for those first, and if a *user's* data
   is involved, always those.

   The key is read lazily rather than at module scope so a missing env var
   fails the one request that needed it, with a name, instead of the import. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    // No session to persist or refresh — this client is per-request and has no
    // user. Leaving auth's defaults on would have it write to storage it has
    // no business touching on the server.
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
