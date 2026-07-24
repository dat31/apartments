"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChannelList,
  WithComponents,
  useChannelListContext,
  useChatContext,
} from "stream-chat-react";
import type { ChannelFilters, ChannelOptions, ChannelSort } from "stream-chat";
import { MessageSquareText, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import { MessagingChat, useMessaging } from "./chat-provider";
import { ChatThread, ThreadSkeleton } from "./chat-thread";

/* The /messages inbox: two panes on desktop, list ⇄ thread on mobile.

   The shell is ours — Stream has no two-pane layout — but everything inside
   it is the SDK's: <ChannelList> owns the query, the watches and the
   reconnect/new-membership event handling, and <ChatThread> renders the
   prebuilt message tree.

   Panes deliberately carry no card background: in the design the list and the
   thread sit directly on the page, and only the active row is filled. */

const PANE = "h-[calc(100vh-14rem)] min-h-[460px]";
const LIST_COLUMN = "grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr]";

/* Zero conversations replaces the whole grid with one card, so the layout and
   the header's subtitle both key off `[data-inbox-empty]` — the marker the
   empty state renders (stream-components.tsx) — rather than a second source of
   truth for "how many channels are there". The `has-[…]` variants below are
   written out in full on purpose: Tailwind scans source text for complete
   class names, so an interpolated variant never reaches the stylesheet. */

export function Inbox({ initialChannelId }: { initialChannelId?: string }) {
  const t = useTranslations("messaging");
  const { profile } = useProfile();
  const [channelCount, setChannelCount] = React.useState(0);

  return (
    <div className="group/inbox container mx-auto px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
            <MessageSquareText size={26} className="text-primary" /> {t("title")}
          </h1>
          <InboxSubtitle count={channelCount} />
        </div>
        {profile.role !== "owner" && (
          <Button asChild variant="secondary" className="h-11 gap-1.5">
            <Link href="/apartments">
              <Search size={16} /> {t("browseHomes")}
            </Link>
          </Button>
        )}
      </header>

      <MessagingChat fallback={<InboxSkeleton />}>
        <InboxPanes initialChannelId={initialChannelId} onCount={setChannelCount} />
      </MessagingChat>
    </div>
  );
}

function InboxSubtitle({ count }: { count: number }) {
  const t = useTranslations("messaging");
  const { failed } = useMessaging();

  if (failed) {
    return <p className="mt-1 text-destructive">{t("connectionFailed")}</p>;
  }
  return (
    <>
      <p className="mt-1 text-muted-foreground group-has-[[data-inbox-empty]]/inbox:hidden">
        {t("countSub", { count })}
      </p>
      <p className="mt-1 hidden text-muted-foreground group-has-[[data-inbox-empty]]/inbox:block">
        {t("emptySubtitle")}
      </p>
    </>
  );
}

function InboxPanes({
  initialChannelId,
  onCount,
}: {
  initialChannelId?: string;
  onCount: (count: number) => void;
}) {
  const { channel: active, client, setActiveChannel } = useChatContext("Inbox");
  const userId = client.userID;

  /* Referentially stable, or ChannelList re-runs its query on every render. */
  const filters = React.useMemo<ChannelFilters>(
    () => ({ type: CHANNEL_TYPE, members: { $in: userId ? [userId] : [] } }),
    [userId]
  );
  const sort = React.useMemo<ChannelSort>(() => ({ last_message_at: -1 }), []);
  const options = React.useMemo<ChannelOptions>(() => ({ limit: 20 }), []);

  /* The design's "CONVERSATIONS · n" row is exactly Stream's ChannelListHeader
     slot, and it renders inside ChannelListContext — so the count comes from
     the SDK's own loaded-channel state instead of a parallel query. The
     component identity is memoised; a new one per render would remount the
     header on every keystroke elsewhere on the page. */
  const overrides = React.useMemo(
    () => ({ ChannelListHeader: makeListHeader(onCount) }),
    [onCount]
  );

  return (
    <div
      className={cn(
        LIST_COLUMN,
        PANE,
        "has-[[data-inbox-empty]]:block has-[[data-inbox-empty]]:h-auto has-[[data-inbox-empty]]:min-h-0"
      )}
    >
      <div
        className={cn("flex min-h-0 flex-col", active ? "hidden lg:flex" : "flex")}
      >
        <WithComponents overrides={overrides}>
          <ChannelList
            filters={filters}
            sort={sort}
            options={options}
            customActiveChannel={initialChannelId}
            /* Otherwise a phone opens straight into whichever thread happens
               to be newest, with no way back to the list. */
            setActiveChannelOnMount={false}
          />
        </WithComponents>
      </div>

      <div
        className={cn(
          "min-h-0 group-has-[[data-inbox-empty]]/inbox:hidden",
          active ? "flex" : "hidden lg:flex"
        )}
      >
        {active ? (
          <ChatThread
            key={active.cid}
            channelId={active.id!}
            onBack={() => setActiveChannel(undefined)}
          />
        ) : (
          <NoThreadSelected />
        )}
      </div>
    </div>
  );
}

function makeListHeader(onCount: (count: number) => void) {
  return function InboxListHeader() {
    const t = useTranslations("messaging");
    const { channels } = useChannelListContext();
    const count = channels.length;

    React.useEffect(() => onCount(count), [count]);

    return (
      <div className="flex shrink-0 items-center justify-between gap-2 py-3 pr-4 group-has-[[data-inbox-empty]]/inbox:hidden sm:pr-5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("conversations")}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
    );
  };
}

function NoThreadSelected() {
  const t = useTranslations("messaging");
  return (
    <div className="grid flex-1 place-items-center p-10 text-center">
      <div>
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center bg-secondary text-muted-foreground">
          <MessageSquareText size={26} />
        </div>
        <p className="font-medium">{t("selectThreadTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("selectThreadBody")}</p>
      </div>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className={cn(LIST_COLUMN, PANE)} aria-busy="true">
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 py-3 pr-4 sm:pr-5">
          <Skeleton className="h-3 w-24 rounded-none" />
          <Skeleton className="h-3 w-4 rounded-none" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 px-4 py-3.5">
              <Skeleton className="size-11 shrink-0 rounded-none" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28 rounded-none" />
                <Skeleton className="mt-1.5 h-3 w-40 rounded-none" />
                <Skeleton className="mt-2 h-3.5 w-32 rounded-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <ThreadSkeleton className="hidden lg:flex" />
    </div>
  );
}
