"use client";

import { Channel, MessageList, Window, useChatContext } from "stream-chat-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNEL_TYPE } from "@/lib/stream/channel";
import { ThreadHeader } from "./thread-header";
import { ThreadComposer } from "./thread-composer";

/* The shared thread island — the inbox's right pane and the inline tour
   panels render the same component.

   It assumes a <Chat> ancestor (mounted by <MessagingChat>), so it never
   nests providers when the inbox already has one.

   Watching is left to <Channel>: it calls the query itself on mount when
   `channel.initialized` is false, and subscribes to the channel's events for
   the lifetime of the mount. Adding our own channel.watch() here would just
   duplicate that request. */
export function ChatThread({
  channelId,
  onBack,
  className,
}: {
  channelId: string;
  onBack?: () => void;
  className?: string;
}) {
  const { client } = useChatContext("ChatThread");

  /* client.channel() is synchronous and cached by cid, so the channel is
     resolved during render. Holding it in state and clearing it from effect
     cleanup — the obvious alternative — blanks a thread that is already on
     screen the moment any effect re-runs. */
  const channel = client.channel(CHANNEL_TYPE, channelId);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-background", className)}>
      <Channel channel={channel}>
        <Window>
          <ThreadHeader onBack={onBack} />
          <MessageList />
          <ThreadComposer />
        </Window>
      </Channel>
    </div>
  );
}

/* Shaped like the thread it precedes and confined to its own pane. Never
   FullScreenLoader: that one is `fixed inset-0` and escapes the tour card or
   inbox pane to cover the whole viewport. */
export function ThreadSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col bg-background", className)}
      aria-busy="true"
    >
      <div className="flex shrink-0 items-center gap-3 bg-card px-4 py-3.5">
        <Skeleton className="size-10 shrink-0 rounded-none" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1.5 h-3 w-44" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 p-5">
        <Skeleton className="h-10 w-2/5" />
        <Skeleton className="h-14 w-3/5 self-end" />
        <Skeleton className="h-10 w-1/2" />
      </div>
      <Skeleton className="m-4 h-11 shrink-0 rounded-none" />
    </div>
  );
}
