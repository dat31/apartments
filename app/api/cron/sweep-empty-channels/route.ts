import { NextResponse, type NextRequest } from "next/server";
import { streamServer } from "@/lib/stream/server";
import { CHANNEL_TYPE } from "@/lib/stream/channel";

/* Deletes `messaging` channels that never carried a message.

   Provisioning is deliberately eager — membership must be set server-side
   from RLS-checked rows, so a channel exists from "intent to maybe talk",
   not from the first message — which means "Message owner" taps that never
   send accumulate empty channels (docs/plans/messaging-empty-channels.md).
   The inbox already hides them (`last_message_at: { $exists: true }`); this
   sweep bounds the server-side accumulation itself.

   Deletion is safe by construction: every surface that touches a channel
   calls an idempotent ensure* action first (tour panels, "Message owner"),
   so a swept channel is transparently re-created on the next legitimate
   open. An empty channel has no messages and no read state worth keeping,
   hence hard delete.

   Invoked by Vercel cron (vercel.json, daily 03:17 UTC = 10:17 Da Nang).
   Vercel sends `Authorization: Bearer ${CRON_SECRET}` when that env var is
   set; without CRON_SECRET configured the route refuses to run at all.

   Manual invocation (same auth):
     ?dry=1     report what would be deleted, delete nothing
     ?days=N    override the age cutoff (default 30; min 1 unless dry —
                a live sweep at 0 could race a channel someone opened
                seconds ago and is about to type into) */

const DEFAULT_GRACE_DAYS = 30;
/* 30 channels is queryChannels' server-side page cap; 10 pages bounds a run
   well inside the function timeout. Leftovers are picked up next run. */
const PAGE_SIZE = 30;
const MAX_PAGES = 10;
/* DeleteChannels caps cids per call. */
const DELETE_BATCH = 100;

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
  const rawDays = Number(params.get("days") ?? DEFAULT_GRACE_DAYS);
  const days = Number.isFinite(rawDays)
    ? Math.max(dry ? 0 : 1, rawDays)
    : DEFAULT_GRACE_DAYS;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const client = streamServer();

  try {
    /* Collect first, delete after: DeleteChannels is an async task, so
       deleting while paginating would shift offsets under the query. */
    const cids: string[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const channels = await client.queryChannels(
        {
          type: CHANNEL_TYPE,
          last_message_at: { $exists: false },
          created_at: { $lt: cutoff },
        },
        { created_at: 1 },
        { limit: PAGE_SIZE, offset: page * PAGE_SIZE, state: false }
      );
      channels.forEach((channel) => {
        // Belt and braces: the filter already guarantees this, but a deletion
        // must never depend on a filter alone.
        if (!channel.data?.last_message_at && channel.cid) cids.push(channel.cid);
      });
      if (channels.length < PAGE_SIZE) break;
    }

    const taskIds: string[] = [];
    if (!dry) {
      for (let i = 0; i < cids.length; i += DELETE_BATCH) {
        const batch = cids.slice(i, i + DELETE_BATCH);
        const result = await client.deleteChannels(batch, { hard_delete: true });
        if (result.task_id) taskIds.push(result.task_id);
      }
    }

    return NextResponse.json(
      {
        dry,
        cutoffDays: days,
        matched: cids.length,
        deleted: dry ? 0 : cids.length,
        taskIds,
        ...(dry ? { cids } : {}),
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[stream] empty-channel sweep failed", error);
    return NextResponse.json(
      { error: "sweep-failed" },
      { status: 502, headers: NO_STORE }
    );
  }
}
