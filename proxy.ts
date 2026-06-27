import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/get-locale";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The Supabase email-link callback lives outside the [lang] tree and must
  // not be locale-prefixed — let it through to the auth session handling.
  const isAuthCallback = pathname === "/auth" || pathname.startsWith("/auth/");

  const firstSegment = pathname.split("/")[1];
  const pathnameHasLocale = isLocale(firstSegment);

  // Redirect unprefixed page requests to a locale-prefixed URL.
  if (!pathnameHasLocale && !isAuthCallback) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Locale (or auth callback) is in place — refresh the auth session and run
  // the protected-route / auth-page guards.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets and image files so the auth
     * session is refreshed before Server Components read it, and so unprefixed
     * paths get redirected to a locale. See
     * https://nextjs.org/docs/app/api-reference/file-conventions/proxy
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
