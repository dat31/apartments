"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Channel,
  MessageList,
  Window,
  useChatContext,
} from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import { useMessaging } from "./chat-provider";
import { ThreadComposer } from "./thread-composer";

/* One conversation, built from Stream's prebuilt components.

   Deliberately dumb about *which* conversation: it takes an already-resolved
   channel id. Provisioning — who the members are, whether the thread is still
   writable — is decided by a Server Action before this renders, so the browser
   never gets a say in it. Both the tour panel and the listing "Message owner"
   flow reuse this. */

export function ChatThread({
  channelId,
  className,
}: {
  channelId: string;
  className?: string;
}) {
  const t = useTranslations("messaging");
  const { ready, failed } = useMessaging();

  /* The connection can fail terminally (no token, Stream unreachable), and a
     skeleton that never resolves is worse than an error — it reads as "still
     loading" forever. */
  if (failed) return <ThreadError message={t("connectFailed")} />;

  /* Gated rather than rendered-and-hidden: ConnectedThread calls
     useChatContext, which is only valid inside the provider's <Chat>. */
  if (!ready) return <ThreadSkeleton />;
  return <ConnectedThread channelId={channelId} className={className} />;
}

function ConnectedThread({
  channelId,
  className,
}: {
  channelId: string;
  className?: string;
}) {
  const { client } = useChatContext();
  /* Keyed by channel for the same reason as `watched` below — one thread
     failing to load must not condemn the next one. */
  const [failed, setFailed] = React.useState<StreamChannel | null>(null);

  /* Resolved during render, not in an effect. client.channel() opens no
     connection — it either builds the object or hands back the one already in
     client.activeChannels — so there is nothing to await before the reference
     exists, and holding it in state only created a window where the thread
     had no channel to show. */
  const channel: StreamChannel = React.useMemo(
    () => client.channel(CHANNEL_TYPE, channelId),
    [client, channelId]
  );

  /* Which channel has been watched, rather than a bare "is it ready" flag:
     pointing this component at a different conversation has to show the
     skeleton again, and a boolean carried over from the previous one would
     not. `initialized` is the SDK's own record of having watched — true
     straight away for a conversation opened earlier in this session, which is
     what makes reopening a tour panel instant rather than a fresh skeleton. */
  const [watched, setWatched] = React.useState<StreamChannel | null>(null);
  const ready = channel.initialized || watched === channel;

  React.useEffect(() => {
    /* Nothing to do — `ready` above already reads `initialized` directly, so
       a conversation opened earlier this session renders on the first pass
       with no state round trip. */
    if (channel.initialized) return;
    let live = true;

    channel
      .watch()
      .then(() => {
        if (live) setWatched(channel);
      })
      .catch(() => {
        if (live) setFailed(channel);
      });

    /* A `live` flag rather than a useRef "run once" guard: the ref would
       survive strict mode's unmount→remount and skip the second setup
       entirely.

       Teardown drops the callback and nothing else. In particular it must not
       reset `watched` — the channel object outlives this component, so
       re-running the effect would blank a thread that is already on screen —
       and it must NOT stopWatching: client.channel() hands back the cached
       instance from client.activeChannels, so the object here is shared with
       every other consumer of the same conversation, and unwatching it would
       silently cut their live updates too. The provider owns connection
       lifetime; this only borrows it. */
    return () => {
      live = false;
    };
  }, [channel]);

  if (failed === channel) return <ThreadError />;

  if (!ready) return <ThreadSkeleton />;

  return (
    <div className={className ?? "h-[26rem]"}>
      {/* No <Thread />: the thread-reply action is removed in
          stream-components.tsx, so nothing here can open one. */}
      <Channel channel={channel}>
        <Window>
          <MessageList />
          <ThreadComposer />
        </Window>
      </Channel>
    </div>
  );
}

/* The placeholder for one conversation, shaped like the thread it precedes:
   a run of alternating bubbles above a composer bar.

   It fills its container and nothing more. It must never be the app's
   <FullScreenLoader> — that is `fixed inset-0`, so used here it escapes the
   tour card or the inbox pane it was placed in and covers the whole viewport
   with the route-level splash, which reads as the page reloading every time a
   thread resolves. */
const BUBBLES = [
  { mine: false, width: "w-40" },
  { mine: true, width: "w-28" },
  { mine: false, width: "w-52" },
  { mine: true, width: "w-36" },
];

export function ThreadSkeleton() {
  const t = useTranslations("messaging");
  return (
    <div
      className="flex h-full min-h-64 flex-col"
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
    >
      <div className="flex flex-1 flex-col justify-end gap-3 p-4">
        {BUBBLES.map((bubble, i) => (
          <div
            key={i}
            className={cn("flex", bubble.mine ? "justify-end" : "justify-start")}
          >
            <Skeleton className={cn("h-9 rounded-none", bubble.width)} />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <Skeleton className="h-10 w-full rounded-none" />
      </div>
    </div>
  );
}

/* Shown wherever a thread would be, once loading it has definitively failed —
   both for this one conversation and for the connection behind all of them. */
export function ThreadError({ message }: { message?: string }) {
  const t = useTranslations("messaging");
  return (
    <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
      <TriangleAlert size={15} className="text-destructive shrink-0" />
      {message ?? t("loadFailed")}
    </p>
  );
}
