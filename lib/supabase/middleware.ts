import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { routing } from "@/i18n/routing";

const isLocale = (value: string | undefined): value is (typeof routing.locales)[number] =>
  !!value && (routing.locales as readonly string[]).includes(value);

/* Split a locale prefix off a pathname, e.g. /en/apartments/saved ->
   { locale: "en", rest: "/apartments/saved" }. With localePrefix "as-needed"
   the default locale has no prefix, so an unprefixed path resolves to it. */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) {
    const rest = "/" + segments.slice(2).join("/");
    return {
      locale: segments[1],
      rest: rest === "/" ? "/" : rest.replace(/\/$/, ""),
    };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

/* Build a localized path under the "as-needed" strategy: the default locale is
   unprefixed, every other locale gets a prefix. */
function localized(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/* Routes that require a signed-in user. Everything not listed here (landing,
   public apartment browsing, public owner profiles, the auth pages) stays
   reachable by anonymous visitors — public listing reads are served by the
   cookieless anon client in ./public. */
const PROTECTED: RegExp[] = [
  /^\/owner\/dashboard(\/|$)/,
  // The saved shortlist is per-user, but its /compare child stays public:
  // the compared ids live in the URL so a comparison can be shared with
  // someone who isn't signed in.
  /^\/apartments\/saved(?!\/compare(\/|$))(\/|$)/,
  /^\/apartments\/create(\/|$)/,
  /^\/apartments\/[^/]+\/edit(\/|$)/,
  /^\/tour(\/|$)/,
];

/* Auth pages a signed-in user has no reason to see. /reset-password is left
   out on purpose: a recovery link signs the user in, then sends them there. */
const AUTH_PAGES = ["/signin", "/signup", "/forgot-password"];

/* Refreshes the Supabase auth session onto the given response (produced by the
   next-intl middleware), then applies the locale-aware route guards. Auth
   cookies set during the refresh are written onto `response`, and carried over
   when we issue a redirect. */
export async function updateSession(request: NextRequest, response: NextResponse) {
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
  // Guards match against the locale-stripped path, but redirects keep the
  // visitor in their current locale.
  const { locale, rest } = splitLocale(pathname);

  if (!isSignedIn && PROTECTED.some((re) => re.test(rest))) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, "/signin");
    url.search = "";
    // Store the unprefixed target; the sign-in page re-localizes it.
    url.searchParams.set("next", rest);
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (isSignedIn && AUTH_PAGES.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, "/apartments");
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
