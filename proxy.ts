import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The Supabase email-link callback lives outside the localized tree and must
  // not be locale-rewritten — skip next-intl for it and just refresh the
  // session.
  const isAuthCallback = pathname === "/auth" || pathname.startsWith("/auth/");

  const response = isAuthCallback
    ? NextResponse.next({ request })
    : handleI18nRouting(request);

  return updateSession(request, response);
}

export const config = {
  // Run on every request except API routes, Next internals, and files with an
  // extension. This lets next-intl handle locale routing and lets the auth
  // session refresh before Server Components read it.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
