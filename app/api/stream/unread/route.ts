import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamServer } from "@/lib/stream/server";

/* Unread-message total for the signed-in caller, for the nav "Messages" badge.

   Socket-free by design: the header renders on every page, so the badge must
   never mint a token or open a websocket (chat-implementation-plan.md §3).
   The browser hits this route over HTTP; only the route touches Stream, via a
   single server-SDK read.

   The session cookie is the sole identity input — there is no user_id
   parameter to forge — mirroring the token route. Pure read: never upserts a
   user and never creates anything (this runs on every page whose cache went
   stale). */

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/* Stream error 16 / HTTP 404 = "the user does not exist". A signed-in user
   who has never opened chat has no Stream record yet (only the token route
   upserts, and it hasn't run for them), which is not an error — it means
   zero unread. */
function isUserNotFound(error: unknown): boolean {
  const e = error as { code?: number; status?: number };
  return e?.code === 16 || e?.status === 404;
}

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

  try {
    const counts = await streamServer().getUnreadCount(user.id);
    return NextResponse.json(
      { total: counts.total_unread_count },
      { headers: NO_STORE }
    );
  } catch (error) {
    if (isUserNotFound(error)) {
      return NextResponse.json({ total: 0 }, { headers: NO_STORE });
    }
    console.error("[stream] unread count failed", error);
    return NextResponse.json(
      { error: "stream-unavailable" },
      { status: 502, headers: NO_STORE }
    );
  }
}
