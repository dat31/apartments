import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuthError } from "@/lib/auth-log";

/* Email-link landing for signup confirmation and password recovery (PKCE).
   Verifies the one-time token, which sets the session cookie, then forwards
   the user on to `next` (e.g. /reset-password) or the app. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/apartments";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    // Token present but rejected (expired / already used / wrong type).
    logAuthError("confirm", { type, next }, error);
  } else {
    logAuthError(
      "confirm",
      { type, next, hasToken: Boolean(token_hash) },
      "missing token_hash or type in confirmation link"
    );
  }

  return NextResponse.redirect(
    new URL("/signin?error=link-expired", request.url)
  );
}
