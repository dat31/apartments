import { NextResponse, type NextRequest } from "next/server";
import {
  countDismissedNotificationsBefore,
  purgeDismissedNotifications,
} from "@/lib/services/notifications";

/* Hard-deletes notifications a user dismissed long enough ago that undo is
   no longer a possibility.

   The other half of the soft delete added in 20260805090000. Dismissal stamps
   `dismissed_at` instead of deleting the row, which is what makes the undo in
   the toast possible at all — `notifications` has no INSERT policy, so a row
   that is really gone can never be put back. The cost of that is rows which
   are invisible but still stored, and nothing else removes them: the client's
   DELETE policy was dropped along with the hard delete, so this route is the
   only path by which a notification leaves the table.

   Thirty days is far past any undo and far past anyone's memory of the item;
   what it buys is a window in which a support request ("I dismissed something
   by accident last week") is still answerable from the database.

   Invoked by Vercel cron (vercel.json, daily 04:23 UTC = 11:23 Da Nang) —
   offset from the channel sweep so two service-role jobs don't share a minute.
   Vercel sends `Authorization: Bearer ${CRON_SECRET}` when that env var is
   set; without CRON_SECRET configured the route refuses to run at all.

   Manual invocation (same auth):
     ?dry=1     report what would be deleted, delete nothing
     ?days=N    override the retention window (default 30; min 1 unless dry —
                a live purge at 0 would take a dismissal made seconds ago,
                while its undo toast is still on screen) */

const DEFAULT_RETENTION_DAYS = 30;

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
  const rawDays = Number(params.get("days") ?? DEFAULT_RETENTION_DAYS);
  const days = Number.isFinite(rawDays)
    ? Math.max(dry ? 0 : 1, rawDays)
    : DEFAULT_RETENTION_DAYS;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    /* A dry run counts and stops. No ids in the response, for the reason the
       saved-search dry run gives only ids: this is an operator's tool and the
       rows are other people's news. Here even an id would be more than the
       operator needs — the only useful answer is how many. */
    if (dry) {
      return NextResponse.json(
        {
          dry: true,
          cutoffDays: days,
          cutoff,
          matched: await countDismissedNotificationsBefore(cutoff),
          deleted: 0,
        },
        { headers: NO_STORE }
      );
    }

    const deleted = await purgeDismissedNotifications(cutoff);

    return NextResponse.json(
      { dry: false, cutoffDays: days, cutoff, matched: deleted, deleted },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[cron] dismissed-notification purge failed", error);
    return NextResponse.json(
      { error: "purge-failed" },
      { status: 500, headers: NO_STORE }
    );
  }
}
