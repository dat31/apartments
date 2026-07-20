import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** The signed-in viewer's auth uuid (JWT `sub`), or null when signed out.

    getClaims() verifies the JWT locally (no auth-server round-trip), which is
    enough for a UI-only check — RLS still guards the data. Wrapped in React
    cache() so the cookie read + verification happens once per request even
    though several leaves ask (both OwnerCards + both BookTourGates). */
const viewerSub = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** Whether the signed-in viewer is `ownerId` — i.e. the listing's owner
    column holds their auth uuid. Seed owner keys ("mai", "you", …) never
    match a uuid, so seed listings always resolve false.

    Reading the session cookie makes this per-request, so callers must sit
    below their own Suspense boundary: these are the detail page's only
    request-time reads; everything else prerenders (see DetailContent). */
export async function viewerOwns(ownerId: string): Promise<boolean> {
  return (await viewerSub()) === ownerId;
}
