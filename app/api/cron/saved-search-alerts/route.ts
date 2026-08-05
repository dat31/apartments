import { NextResponse, type NextRequest } from "next/server";
import { matchSavedSearches } from "@/lib/notifications/match";
import {
  claimSavedSearchMatches,
  insertSavedSearchNotifications,
  listAlertableSavedSearches,
  listListingsPublishedSince,
} from "@/lib/services/notifications";

/* Turns newly published homes into saved-search notifications.

   This is the last piece of improvement #3, which shipped its storage in July
   2026 (saved_searches, saved_search_notifications) and then stopped: the
   delivery half was an email Edge Function nobody could switch on without an
   email provider. In-app notifications need no provider, so the alert a renter
   was promised when they flipped the toggle now actually arrives.

   Matching runs through lib/notifications/match.ts, which calls the browse
   page's own filterListings. That is the reason this lives in the Next.js app
   rather than in the Edge Function that was written for it: the function
   carries a hand-maintained copy of the predicate, and a saved search has to
   return exactly what the same URL returns on Browse.

   Invoked by Vercel cron (vercel.json, every 15 minutes). Vercel sends
   `Authorization: Bearer ${CRON_SECRET}` when that env var is set; without
   CRON_SECRET configured the route refuses to run at all — it writes into
   other people's feeds, so an open endpoint is not an option.

   Manual invocation (same auth):
     ?dry=1        report what would be sent, write nothing
     ?minutes=N    override the lookback window (default 60) */

const DEFAULT_LOOKBACK_MINUTES = 60;

/* Deliberately four times the 15-minute schedule. A late run, a deploy, or a
   cold start must not drop an alert, and overlap costs nothing: the dedupe
   table is what stops a second notification, not a precise cursor. */
const MAX_LOOKBACK_MINUTES = 60 * 24 * 7;

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503, headers: NO_STORE }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  const params = request.nextUrl.searchParams;
  const dry = params.get("dry") === "1";
  const rawMinutes = Number(params.get("minutes") ?? DEFAULT_LOOKBACK_MINUTES);
  const minutes = Number.isFinite(rawMinutes)
    ? Math.min(Math.max(1, rawMinutes), MAX_LOOKBACK_MINUTES)
    : DEFAULT_LOOKBACK_MINUTES;

  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  try {
    /* Both reads bypass RLS — matching is cross-user by nature — which is why
       they live behind the service's admin section and this route is gated on
       the secret above. */
    const [searches, listings] = await Promise.all([
      listAlertableSavedSearches(),
      listListingsPublishedSince(since),
    ]);

    // Nothing published in the window is the common case; skip the rest.
    if (!listings.length || !searches.length) {
      return NextResponse.json(
        { since, searches: searches.length, listings: listings.length, sent: 0 },
        { headers: NO_STORE }
      );
    }

    const matches = matchSavedSearches(searches, listings);

    if (dry) {
      return NextResponse.json(
        {
          dry: true,
          since,
          searches: searches.length,
          listings: listings.length,
          matched: matches.length,
          /* Ids only. A dry run is an operator's tool, and the homes and
             searches involved are other people's. */
          pairs: matches.map((m) => [m.savedSearchId, m.listingId]),
        },
        { headers: NO_STORE }
      );
    }

    /* Claim first, notify second. The dedupe row is the lock: two overlapping
       runs compute the same matches, and the one that loses the insert gets an
       empty list back and sends nothing. The other order would leave a window
       in which a retry double-notifies. */
    const claimed = await claimSavedSearchMatches(
      matches.map((m) => ({ savedSearchId: m.savedSearchId, listingId: m.listingId }))
    );

    const byPair = new Map(
      matches.map((m) => [`${m.savedSearchId}:${m.listingId}`, m.profileId])
    );
    const sent = await insertSavedSearchNotifications(
      claimed.map((pair) => ({
        savedSearchId: pair.savedSearchId,
        listingId: pair.listingId,
        profileId: byPair.get(`${pair.savedSearchId}:${pair.listingId}`)!,
      }))
    );

    return NextResponse.json(
      {
        since,
        searches: searches.length,
        listings: listings.length,
        matched: matches.length,
        sent,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[cron] saved-search alerts failed", error);
    return NextResponse.json(
      { error: "failed" },
      { status: 500, headers: NO_STORE }
    );
  }
}
