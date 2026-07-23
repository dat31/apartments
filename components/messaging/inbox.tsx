"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Channel,
  ChannelList,
  MessageList,
  Window,
  useChatContext,
} from "stream-chat-react";
import type { ChannelFilters, ChannelOptions, ChannelSort } from "stream-chat";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/auth";
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import { MessagingProvider, useMessaging } from "./chat-provider";
import { ThreadError, ThreadSkeleton } from "./chat-thread";
import { EmptyInbox } from "./stream-components";
import { ThreadComposer } from "./thread-composer";
import { ThreadHeader } from "./thread-header";
import { TourThreadSync } from "./tour-thread-sync";

/* The inbox — every conversation the signed-in user is part of, listing
   threads and tour threads alike.

   Built on the prebuilt <ChannelList> / <Channel> pair rather than a
   hand-rolled list: it already does querying, pagination, live reordering,
   unread state and previews. The two-pane split and the mobile
   list-or-thread behaviour are layout around it. */

export function Inbox({ initialChannelId }: { initialChannelId?: string }) {
  return (
    <MessagingProvider>
      <InboxShell initialChannelId={initialChannelId} />
    </MessagingProvider>
  );
}

function InboxShell({ initialChannelId }: { initialChannelId?: string }) {
  const t = useTranslations("messaging");
  const { ready, failed } = useMessaging();
  const { data: user, isPending } = useUser();

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
            <MessageCircle size={26} className="text-primary" />
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="secondary" className="h-11 gap-1.5">
          <Link href="/apartments">
            <Search size={16} /> {t("browseHomes")}
          </Link>
        </Button>
      </div>

      {/* `failed` is checked first: it is terminal, and the skeleton below
          would otherwise be the permanent end state of a token request that
          is never going to succeed. */}
      {failed ? (
        <div className="bg-card">
          <ThreadError message={t("connectFailed")} />
        </div>
      ) : isPending || !ready || !user ? (
        <div className="bg-card">
          <ThreadSkeleton />
        </div>
      ) : (
        <Panes userId={user.id} initialChannelId={initialChannelId} />
      )}
    </div>
  );
}

function Panes({
  userId,
  initialChannelId,
}: {
  userId: string;
  initialChannelId?: string;
}) {
  const t = useTranslations("messaging");
  /* The active channel is owned by <ChannelList>; reading it here is only for
     deciding which pane the phone-sized layout shows. */
  const { channel } = useChatContext();

  const filters = React.useMemo<ChannelFilters>(
    () => ({ type: CHANNEL_TYPE, members: { $in: [userId] } }),
    [userId]
  );
  const sort = React.useMemo<ChannelSort>(() => ({ last_message_at: -1 }), []);
  /* `presence: true` is what subscribes the socket to the members' online
     state — without it the thread header can only ever say "offline". */
  const options = React.useMemo<ChannelOptions>(
    () => ({ limit: 20, presence: true }),
    []
  );

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] gap-6"
      style={{ height: "calc(100vh - 14rem)", minHeight: 460 }}
    >
      <div className={cn("min-h-0", channel && "hidden lg:block")}>
        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          /* The channel list takes its own empty state as a prop rather than
             from the component context, unlike every other region. */
          EmptyStateIndicator={EmptyInbox}
          /* Deep link from a listing's "Message owner": force that thread
             active instead of whichever one is most recent. */
          customActiveChannel={initialChannelId}
          setActiveChannelOnMount={!initialChannelId}
        />
      </div>

      <div className={cn("min-h-0", !channel && "hidden lg:block")}>
        {/* No `channel` prop — <ChannelList> owns the active channel. */}
        <Channel EmptyPlaceholder={<NoThreadSelected />}>
          <TourThreadSync />
          <Window>
            <ThreadHeader />
            {/* Per-message avatars are suppressed in stream-theme.css —
                the prop for it only reaches the virtualized list. */}
            <MessageList />
            <ThreadComposer />
            <p className="mx-auto hidden w-full max-w-3xl pb-3 text-xs text-muted-foreground sm:block">
              {t("composerHint")}
            </p>
          </Window>
        </Channel>
      </div>
    </div>
  );
}

/* The right-hand pane before any conversation is chosen. Distinct from
   stream-components' EmptyThread, which is the empty state of a thread that
   *is* open. */
function NoThreadSelected() {
  const t = useTranslations("messaging");
  return (
    <div className="flex-1 grid place-items-center p-10 text-center">
      <div>
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <MessageCircle size={26} />
        </div>
        <p className="font-medium">{t("selectTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("selectBody")}</p>
      </div>
    </div>
  );
}
