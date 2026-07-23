"use client";

import * as React from "react";
import { useChannelStateContext } from "stream-chat-react";
import { ensureTourChannel } from "@/lib/actions/tour-chat";

/* Re-runs a tour thread's closure check when it is opened from the inbox.

   `frozen` is what makes a thread read-only, and ensureTourChannel is the only
   thing that sets it — evaluated on open rather than by a scheduled job. The
   tour cards get that for free, because opening a panel there *is* a call to
   ensureTourChannel. The inbox does not: <ChannelList> hands back whatever
   Stream has stored, so a tour that was declined (or whose grace window
   elapsed) since the last time someone expanded its card would still show a
   live composer here, and the send would fail with nothing to explain it.

   So the inbox re-runs the same server-side check on open instead of
   re-deriving the policy in the browser. The freeze arrives back as a
   `channel.updated` event, which <Channel> folds into channel.data, which is
   what ThreadComposer reads — no local state to keep in step.

   Renders nothing; it exists for the effect. */
export function TourThreadSync() {
  const { channel } = useChannelStateContext();
  const tourId = channel.data?.tour_id;

  React.useEffect(() => {
    /* Listing threads have no tour behind them and never close. */
    if (!tourId) return;
    /* Errors are deliberately swallowed: this is a reconciliation, not the
       thread's own load. A failure leaves the composer as Stream has it,
       which is the state every other client sees too. */
    ensureTourChannel(tourId).catch(() => {});
  }, [tourId]);

  return null;
}
