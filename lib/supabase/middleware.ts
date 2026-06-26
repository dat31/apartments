import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/* Routes that require a signed-in user. Everything not listed here (landing,
   public apartment browsing, public owner profiles, the auth pages) stays
   reachable by anonymous visitors — public listing reads are served by the
   cookieless anon client in ./public. */
const PROTECTED: RegExp[] = [
  /^\/owner\/dashboard(\/|$)/,
  /^\/apartments\/saved(\/|$)/,
  /^\/apartments\/create(\/|$)/,
  /^\/apartments\/[^/]+\/edit(\/|$)/,
  /^\/tour(\/|$)/,
];

/* Auth pages a signed-in user has no reason to see. /reset-password is left
   out on purpose: a recovery link signs the user in, then sends them there. */
const AUTH_PAGES = ["/signin", "/signup", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getClaims() refreshes the session token. Do not run other code
  // between createServerClient() and this call, or sessions may not refresh.
  // Never use getSession() in server code — its result is not verified.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = !!data?.claims;

  const { pathname } = request.nextUrl;

  if (!isSignedIn && PROTECTED.some((re) => re.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    url.searchParams.set("next", pathname);
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (isSignedIn && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/apartments";
    url.search = "";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

/* Carry any refreshed auth cookies onto a redirect response. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
