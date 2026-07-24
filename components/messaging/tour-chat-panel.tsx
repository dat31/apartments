"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ensureTourChannel } from "@/lib/actions/tour-chat";
import { type TourRequest } from "@/schemas/tour";
import { MessagingChat, useMessaging } from "./chat-provider";
import { ChatThread, ThreadSkeleton } from "./chat-thread";
import { TourThreadSync } from "./tour-thread-sync";

/* The inline "Messages" affordance on a tour card. Collapsed it is a row with
   an unread badge; expanded it mounts the same thread the inbox uses.

   Collapsing only unmounts <Channel>. It must never call
   channel.stopWatching(): the client caches channel instances, so stopping
   the watch from one surface tears it down for the inbox and the badges too,
   freezing every unread count at its last value. The connection belongs to
   MessagingProvider; surfaces only mount and unmount. */
export function TourChatPanel({ tour }: { tour: TourRequest }) {
  const t = useTranslations("messaging");
  const { failed, unreadByTour } = useMessaging();
  const [open, setOpen] = React.useState(false);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  const unread = unreadByTour[tour.id] ?? 0;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Provision on first open — this also covers tours booked before
    // messaging shipped, which have no channel yet.
    if (!next || channelId) return;
    void ensureTourChannel(tour.id)
      .then((result) => {
        if (result.ok) setChannelId(result.channelId);
        else setError(true);
      })
      .catch(() => setError(true));
  };

  return (
    <div className="relative z-20 mt-1">
      <TourThreadSync tour={tour} />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-muted px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent focus-ring"
      >
        <MessageSquare size={16} className="shrink-0 text-primary" />
        <span className="flex-1 truncate">{t("panelToggle")}</span>
        {unread > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-xs font-semibold tabular-nums text-primary-foreground">
            {unread}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-px flex h-[26rem]">
          {error || failed ? (
            <div className="flex h-full items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
              {t("connectionFailed")}
            </div>
          ) : (
            <MessagingChat fallback={<ThreadSkeleton />}>
              {channelId ? <ChatThread channelId={channelId} /> : <ThreadSkeleton />}
            </MessagingChat>
          )}
        </div>
      )}
    </div>
  );
}
