"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  TypingIndicatorHeader,
  useChannelPreviewInfo,
  useChannelStateContext,
  useChatContext,
  useTypingContext,
} from "stream-chat-react";
import type { Channel as StreamChannel, UserResponse } from "stream-chat";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { useMoney } from "@/hooks/use-money";
import { PALETTE } from "@/lib/data/listings";
import { MessagingAvatar } from "./stream-components";

/* The head of an open conversation.

   Stream's own ChannelHeader answers "who am I talking to". The design asks a
   second question — "which apartment is this about?" — and answers it with a
   chip that links back to the listing. Both channel kinds already carry that
   context in their custom data (see lib/stream/custom-data.ts), so the header
   needs no fetch of its own.

   Also owns the phone-sized back affordance: clearing the active channel is
   what swaps the panes back to the conversation list. */

export function ThreadHeader() {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const money = useMoney();
  const { channel, channelConfig } = useChannelStateContext();
  const { setActiveChannel } = useChatContext();
  const { typing = {} } = useTypingContext();
  const { displayTitle } = useChannelPreviewInfo({ channel });

  const isTyping =
    channelConfig?.typing_events !== false &&
    Object.values(typing).some(({ parent_id }) => !parent_id);

  const counterpart = useCounterpart(channel);
  const presence = usePresenceLabel(counterpart);

  const tourDate = channel.data?.tour_date;
  const tourTime = channel.data?.tour_time;
  const listingId = channel.data?.listing_id;
  const listingTitle = channel.data?.listing_title;
  const listingPrice = channel.data?.listing_price;
  const listingImage = channel.data?.listing_image;
  const listingPalette = channel.data?.listing_palette;

  /* The stored values are the locale-agnostic ymd/HH:mm plumbing the tour
     scheduling logic runs on; formatting for display belongs at the call site,
     the same way every tour card does it. */
  const subtitle = tourDate
    ? `${presence} · ${t("tourOn", {
        date: format.dateTime(parseYmd(tourDate), {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: tourTime ? formatSlotTime(format, tourTime) : "",
      })}`
    : presence;

  return (
    <div className="flex shrink-0 items-center gap-3 py-3">
      <button
        aria-label={t("back")}
        className="focus-ring -ml-1 inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground lg:hidden"
        onClick={() => setActiveChannel(undefined)}
        type="button"
      >
        <ChevronLeft size={20} />
      </button>

      <span className="relative shrink-0">
        <MessagingAvatar size="lg" userName={displayTitle} />
        {counterpart?.online && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-primary ring-2 ring-background"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{displayTitle}</p>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {isTyping ? <TypingIndicatorHeader /> : subtitle}
        </div>
      </div>

      {listingId && (
        <Link
          /* Wider than the design's `max-w-56`: that was measured against
             "$1,450/mo", and the same line in VND ("36.250.000 ₫/tháng") is
             half as long again — at 56 the price truncated instead of the
             title, which is the one part of the chip that must stay legible. */
          className="focus-ring hidden max-w-72 shrink-0 items-center gap-2.5 bg-muted py-1.5 pl-2.5 pr-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
          href={`/apartments/${listingId}`}
        >
          {/* The listing's own photo, or its colour block when it has none —
              the same fallback every listing card in the app uses. A plain
              background rather than next/image: it is a 32px decoration whose
              url came from channel data, and routing it through the image
              optimiser would need the remote host allow-listed for no gain. */}
          <span
            aria-hidden="true"
            className="block h-8 w-8 shrink-0 bg-cover bg-center"
            style={{
              backgroundImage: listingImage
                ? `url(${listingImage})`
                : undefined,
              backgroundColor: listingImage
                ? undefined
                : PALETTE[(listingPalette ?? 0) % PALETTE.length][0],
            }}
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">
              {listingTitle ?? t("aboutAListing")}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {typeof listingPrice === "number"
                ? `${money(listingPrice)}${t("perMonth")} · ${t("view")} →`
                : `${t("viewListing")} →`}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}

/* "14:00" → the locale's own rendering of two o'clock. The anchor date is
   arbitrary and never shown — the same idiom the tour cards use. */
function formatSlotTime(
  format: ReturnType<typeof useFormatter>,
  time: string
): string {
  const [h, m] = time.split(":").map(Number);
  return format.dateTime(new Date(2000, 0, 1, h, m), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* The person on the other end of a one-to-one thread, kept live.

   Presence reaches the browser as `user.presence.changed`, which the SDK folds
   into the channel's own member records — so this only has to ask React to read
   them again. None of it arrives unless the channel was queried with
   `presence: true`; see the ChannelList options in inbox.tsx. */
function useCounterpart(channel: StreamChannel): UserResponse | undefined {
  const [, reread] = React.useReducer((tick: number) => tick + 1, 0);
  const { client } = useChatContext();

  React.useEffect(() => {
    const subscription = client.on("user.presence.changed", reread);
    /* "5 minutes ago" goes stale on its own, with no event to announce it. */
    const timer = setInterval(reread, 60_000);
    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, [client]);

  return Object.values(channel.state.members).find(
    (member) => member.user_id !== client.userID
  )?.user;
}

/* "Active now" / "Active 5 minutes ago" — the answer to "is it worth writing
   right now", which is what the header line is for. */
function usePresenceLabel(user: UserResponse | undefined) {
  const t = useTranslations("messaging");
  const format = useFormatter();

  if (user?.online) return t("activeNow");
  if (user?.last_active) {
    return t("activeAgo", {
      time: format.relativeTime(new Date(user.last_active)),
    });
  }
  return t("offline");
}
