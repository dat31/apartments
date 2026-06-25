import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* Cookieless anon Supabase client for public, cacheable reads. Unlike the
   SSR client in ./server, this never touches cookies(), so it can be used
   inside a "use cache" boundary. Only safe for data RLS exposes to anon
   (e.g. active listings). */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
