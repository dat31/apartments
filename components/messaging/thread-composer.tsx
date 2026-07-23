"use client";

import { useTranslations } from "next-intl";
import { MessageComposer, useChannelStateContext } from "stream-chat-react";
import { Lock } from "lucide-react";

/* The composer, or the reason there isn't one.

   `frozen` is set by the server (lib/actions/tour-chat.ts) and is the only
   thing that actually stops a message being sent — Stream's own composer has
   no capability gate, so a channel left with a live composer accepts input and
   then fails the send with nothing to explain it. Reading the flag here means
   every screen that renders a thread gets the closed state for free, rather
   than each one having to remember to ask. */

export function ThreadComposer() {
  const t = useTranslations("messaging");
  const { channel } = useChannelStateContext();

  if (channel.data?.frozen) {
    return (
      <p className="flex items-center gap-2 px-4 py-3.5 text-sm text-muted-foreground">
        <Lock size={15} className="shrink-0" />
        {t("closedNotice")}
      </p>
    );
  }

  return (
    <MessageComposer additionalTextareaProps={{ placeholder: t("placeholder") }} />
  );
}
