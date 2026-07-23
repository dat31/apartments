import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamServerClient } from "@/lib/stream/server";
import { STREAM_TOKEN_TTL_SECONDS } from "@/lib/stream/channel";
import "@/lib/stream/custom-data";

/* Mints a Stream Chat token for the caller.

   The Supabase session cookie is the *only* identity input — the route takes
   no user_id parameter, so a visitor cannot request a token for someone
   else's account. Stream user ids are Supabase auth user ids, which is what
   lets `tours.renter_id` / `tours.owner_id` be used directly as channel
   members with no mapping table.

   Upserts only the requesting user (stream RULES.md > No auto-seeding). */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  /* The profile row is the app's own identity — the same name and colour block
     the account menu shows. Falls back to signup metadata when the row hasn't
     been seeded yet, mirroring hooks/use-profile.ts. */
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, palette")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.name ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Member";

  /* Name and palette only. Passing `role` would overwrite it on every token
     mint — which for anyone an operator promoted in the Stream dashboard
     means being silently demoted back to `user` on their next visit. New
     users get `user` from Stream by default. */
  const client = streamServerClient();
  await client.upsertUsers([
    { id: user.id, name, palette: profile?.palette ?? undefined },
  ]);

  /* Tokens carry an expiry: an unbounded token cannot be revoked short of
     rotating the app secret, and it outlives the session that produced it. */
  const exp = Math.floor(Date.now() / 1000) + STREAM_TOKEN_TTL_SECONDS;

  return NextResponse.json(
    {
      chatToken: client.createToken(user.id, exp),
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY,
      userId: user.id,
      // Echoed back so the client connects with the same display name this
      // route just upserted, rather than reconnecting as a bare id.
      name,
    },
    // The token is per-user and time-bound — never let a shared cache hold it.
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
