"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  MessageComposer,
  useChannelStateContext,
  useChatContext,
} from "stream-chat-react";
import type { Channel } from "stream-chat";
import { Lock } from "lucide-react";

/* The only composer mount in the app, so "can I write here" is decided once
   and holds on every surface — the inbox pane and the inline tour panels
   alike.

   `channel.data.frozen` is the single source of truth. The SDK will not save
   us here: v14's composer has no capability gate, so an unguarded composer on
   a frozen channel accepts the text, gets an API rejection, and shows the
   user nothing. */
export function ThreadComposer() {
  const { client } = useChatContext("ThreadComposer");
  const { channel } = useChannelStateContext("ThreadComposer");
  const frozen = useChannelFrozen(channel);
  const t = useTranslations("messaging");

  if (frozen) {
    return (
      /* Same wrapper as the composer below, so the notice lands in the thread's
         column instead of spanning the pane. */
      <div className="shrink-0 px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 bg-muted px-5 py-4 text-center text-sm text-muted-foreground">
          <Lock size={15} className="shrink-0" />
          <span className="text-pretty">{t("threadClosed")}</span>
        </div>
      </div>
    );
  }

  // "Message Mai…" — the design addresses the other party by first name.
  const other = Object.values(channel.state.members).find(
    (member) => member.user_id !== client.userID
  )?.user;
  const firstName = (other?.name || "").trim().split(/\s+/)[0];

  return (
    <div className="shrink-0 px-3 py-3 sm:px-5">
      <MessageComposer
        additionalTextareaProps={{
          placeholder: firstName
            ? t("composerPlaceholderNamed", { name: firstName })
            : t("composerPlaceholder"),
        }}
      />
      <p className="mx-auto mt-1.5 hidden max-w-3xl text-xs text-muted-foreground sm:block">
        {t("enterHint")}
      </p>
    </div>
  );
}

/* Freeze state arrives as a `channel.updated` event long after the thread has
   painted (the owner declines a tour while the renter has it open), so it is
   subscribed to rather than read once. */
function useChannelFrozen(channel: Channel): boolean {
  const [frozen, setFrozen] = React.useState(() => !!channel.data?.frozen);
  const [subscribedTo, setSubscribedTo] = React.useState(channel);

  // Re-read during render rather than from an effect: switching threads must
  // not leave the previous channel's write state on screen for a frame.
  if (subscribedTo !== channel) {
    setSubscribedTo(channel);
    setFrozen(!!channel.data?.frozen);
  }

  React.useEffect(() => {
    const subscription = channel.on("channel.updated", () => {
      setFrozen(!!channel.data?.frozen);
    });
    return () => subscription.unsubscribe();
  }, [channel]);

  return frozen;
}
