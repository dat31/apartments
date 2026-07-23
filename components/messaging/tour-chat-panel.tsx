"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type TourRequest } from "@/schemas/tour";
import { ensureTourChannel } from "@/lib/actions/tour-chat";
import { useTourUnread } from "./chat-provider";
import { ChatThread, ThreadError, ThreadSkeleton } from "./chat-thread";

/* The "Messages" affordance on a tour card.

   Expands the thread inline rather than navigating away, matching how the
   day-route view behaves on the same page. One component, two mount points:
   the renter's tour card and the owner dashboard's — the only difference
   between the two sides is who is signed in.

   The channel is provisioned lazily on first expand rather than at booking
   time, so tours that nobody ever messages about cost nothing. */

export function TourChatPanel({ tour }: { tour: TourRequest }) {
  const t = useTranslations("messaging");
  const [open, setOpen] = React.useState(false);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const unread = useTourUnread(tour.id);

  React.useEffect(() => {
    if (!open || channelId) return;
    let mounted = true;

    ensureTourChannel(tour.id)
      .then((result) => {
        if (!mounted) return;
        if (result.ok) setChannelId(result.channelId);
        else setFailed(true);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });

    return () => {
      mounted = false;
    };
  }, [open, channelId, tour.id]);

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={16} />
        {open ? t("hide") : t("messages")}
        {unread > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-xs font-semibold tabular-nums text-primary-foreground">
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="mt-3 bg-background">
          {failed ? (
            <ThreadError />
          ) : channelId ? (
            /* Whether the thread is still writable is the channel's own
               `frozen` flag, set by ensureTourChannel — the composer reads it
               rather than this component re-deriving it from the tour. */
            <ChatThread channelId={channelId} />
          ) : (
            <ThreadSkeleton />
          )}
        </div>
      )}
    </div>
  );
}
