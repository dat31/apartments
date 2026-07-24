import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  streamServer,
  streamUserSeeds,
  upsertStreamUsers,
} from "@/lib/stream/server";
import { STREAM_TOKEN_TTL_SECONDS } from "@/lib/stream/channel";

/* Mints a Stream Chat token for the *caller* — the session cookie is the only
   identity input, so there is no user_id parameter to forge. Takes no
   parameters and is never cached.

   The Supabase auth uuid is the Stream user id; no mapping table exists. */

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  const [seed] = await streamUserSeeds(supabase, [user.id]);
  // Mirror use-profile's fallback chain: the profiles row, then the signup
  // metadata, then the email local part — never an empty display name.
  const name =
    seed.name ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "";

  try {
    await upsertStreamUsers([{ ...seed, name }]);

    const exp = Math.floor(Date.now() / 1000) + STREAM_TOKEN_TTL_SECONDS;
    const chatToken = streamServer().createToken(user.id, exp);

    return NextResponse.json(
      {
        chatToken,
        apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY,
        userId: user.id,
        name,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[stream] token mint failed", error);
    return NextResponse.json(
      { error: "stream-unavailable" },
      { status: 502, headers: NO_STORE }
    );
  }
}
