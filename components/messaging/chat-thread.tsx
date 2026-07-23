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
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import { useMessaging } from "./chat-provider";
import { ThreadComposer } from "./thread-composer";
import { FullScreenLoader } from "../full-screen-loader";

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
  const [channel, setChannel] = React.useState<StreamChannel | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const next = client.channel(CHANNEL_TYPE, channelId);
      await next.watch();
      if (!mounted) return;
      setChannel(next);
    })().catch(() => {
      if (mounted) setFailed(true);
    });

    /* A `mounted` flag rather than a useRef "run once" guard: the ref would
       survive strict mode's unmount→remount and skip the second setup
       entirely.

       Teardown drops the reference and nothing else. It must NOT stopWatching:
       client.channel() hands back the cached instance from client.activeChannels,
       so the object here is shared with every other consumer of the same
       conversation, and unwatching it would silently cut their live updates
       too. The provider owns connection lifetime; this only borrows it. */
    return () => {
      mounted = false;
      setChannel(null);
    };
  }, [client, channelId]);

  if (failed) return <ThreadError />;

  if (!channel) return <ThreadSkeleton />;

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

export function ThreadSkeleton() {
  return (
    <FullScreenLoader />
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
