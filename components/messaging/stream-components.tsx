"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChannelListItemTimestamp,
  MessageActions,
  SummarizedMessagePreview,
  composeChannelListItemAccessibleLabel,
  defaultMessageActionSet,
  useChannelListContext,
  useChatContext,
  useTranslationContext,
  type ChannelListItemUIProps,
  type ChannelAvatarProps,
  type EmptyStateIndicatorProps,
} from "stream-chat-react";
import { BellOff, MessageCircle, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Link } from "@/i18n/navigation";
import { PALETTE } from "@/lib/data/listings";
import { cn } from "@/lib/utils";

/* The regions of Stream's chat UI that the design draws differently.

   Everything that is only a matter of colour, radius or measure is handled by
   stream-theme.css against Stream's own theme variables — cheaper, and it
   can't drop a feature. What lives here are the three places where the design
   is structurally different from the prebuilt component:

   • the conversation row carries the listing it is about, on its own line;
   • avatars are the app's square colour blocks, not round photos;
   • the empty states speak about apartments, not "chats".

   Registered once through <WithComponents> in chat-provider.tsx, so both the
   inbox and the tour cards' inline threads get them. */

/* Last-resort palette pick for someone the client has never seen. Deterministic
   so the colour at least stays put between renders. */
const fallbackPalette = (name: string) => {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return sum % PALETTE.length;
};

const AVATAR_PX: Record<string, number> = {
  "2xl": 56,
  xl: 44,
  lg: 40,
  md: 32,
  sm: 26,
  xs: 20,
};

/* Stream's Avatar, restated as the system's square colour block.

   Profiles in this app carry a name and a palette index, never a photo, so
   `imageUrl` has nothing to resolve — initials are the whole design.

   The palette index is the one stored on the profile, so a person is the same
   colour here as in the account menu and on their owner card. Stream hands
   avatar overrides a display name and nothing else — message rows are rendered
   with `userName: message.user.name || message.user.id` and no id — so the
   name is matched back against the users the client already knows, which for a
   one-to-one thread is a set of two.

   `str-chat__avatar` is not decoration: Stream's message row is a grid that
   places the avatar by that class and hides it on outgoing messages the same
   way. Drop it and every avatar escapes its grid area. */
export function MessagingAvatar({
  userName,
  size,
  className,
}: ChannelAvatarProps) {
  const name = userName || "?";
  const { client } = useChatContext();

  /* Not memoised on purpose: client.state.users is mutated in place as users
     arrive, so a memo keyed on the client would pin whatever was known at
     first render — the fallback colour, forever. The map holds the handful of
     people in the open conversations, so the scan is not worth caching. */
  const known = Object.values(client.state.users).find(
    (u) => (u.name || u.id) === name
  );
  const palette =
    typeof known?.palette === "number" ? known.palette : fallbackPalette(name);

  return (
    <ProfileAvatar
      name={name}
      palette={palette}
      size={AVATAR_PX[String(size)] ?? 40}
      className={cn("str-chat__avatar", className)}
    />
  );
}

/* One conversation in the left rail.

   Everything factual — display name, the last-message preview with its
   attachment/deleted fallbacks, the timestamp, the unread count, the
   accessible name — is the SDK's own; the row only lays it out and adds the
   line the design asks for: which apartment the conversation is about. */
export function ConversationRow(props: ChannelListItemUIProps) {
  const {
    accessibleLabelConfig,
    active,
    channel,
    displayTitle,
    lastMessage,
    messageDeliveryStatus,
    muted,
    onSelect,
    pinned,
    setActiveChannel,
    unread,
    watchers,
  } = props;
  const t = useTranslations("messaging");
  const { client, isMessageAIGenerated } = useChatContext();
  const { t: streamT, tDateTimeParser, userLanguage } = useTranslationContext();

  const accessibleLabel = React.useMemo(
    () =>
      composeChannelListItemAccessibleLabel(
        {
          active,
          channel,
          client,
          displayTitle,
          isMessageAIGenerated,
          latestMessage: lastMessage,
          messageDeliveryStatus,
          t: streamT,
          tDateTimeParser,
          unreadCount: unread,
          userLanguage,
        },
        accessibleLabelConfig
      ),
    [
      accessibleLabelConfig,
      active,
      channel,
      client,
      displayTitle,
      isMessageAIGenerated,
      lastMessage,
      messageDeliveryStatus,
      streamT,
      tDateTimeParser,
      unread,
      userLanguage,
    ]
  );

  const select = (event: React.MouseEvent) => {
    if (onSelect) onSelect(event);
    else setActiveChannel?.(channel, watchers);
  };

  const hasUnread = typeof unread === "number" && unread > 0;
  const subtitle = channel.data?.listing_title ?? t("aboutAListing");

  return (
    <button
      aria-label={accessibleLabel}
      aria-selected={active || undefined}
      className={cn(
        "focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
        active ? "bg-secondary" : "hover:bg-muted"
      )}
      onClick={select}
      role="option"
    >
      <MessagingAvatar aria-hidden="true" size="xl" userName={displayTitle} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium">
            {displayTitle}
            {pinned && <Pin size={13} className="shrink-0 text-primary" />}
            {muted && (
              <BellOff size={13} className="shrink-0 text-muted-foreground" />
            )}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 text-xs tabular-nums",
              hasUnread ? "font-medium text-primary" : "text-muted-foreground"
            )}
          >
            <ChannelListItemTimestamp lastMessage={lastMessage} />
          </span>
        </span>

        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>

        <span className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              hasUnread ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <SummarizedMessagePreview
              latestMessage={lastMessage}
              messageDeliveryStatus={messageDeliveryStatus}
              participantCount={channel.data?.member_count}
            />
          </span>
          {hasUnread && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center bg-primary px-1 text-xs font-semibold tabular-nums text-primary-foreground">
              {unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/* The rail's own heading. Reads the channel count off the list's context
   rather than a second query, so it can't drift from what is rendered. */
export function ConversationsHeader() {
  const t = useTranslations("messaging");
  const { channels } = useChannelListContext();
  return (
    /* Hangs off the pane's left edge while the rows below are inset — the
       design's own asymmetry, not an oversight. */
    <div className="flex shrink-0 items-center justify-between gap-2 py-3 pr-4 sm:pr-5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("conversations")}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {channels.length}
      </span>
    </div>
  );
}

/* Nothing in the thread yet. Stream renders this for a message list and for an
   opened reply thread alike. */
export function EmptyThread({ listType }: EmptyStateIndicatorProps) {
  const t = useTranslations("messaging");
  if (listType === "channel") return null;
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {t("threadEmpty")}
      </p>
    </div>
  );
}

/* No conversations at all — the design's own empty screen, which is why it
   sells the next step rather than stating a fact. Passed to <ChannelList>
   directly: the channel list takes its empty state as a prop, not from the
   component context. */
export function EmptyInbox() {
  const t = useTranslations("messaging");
  return (
    <div className="grid h-full place-items-center bg-card p-10 text-center">
      <div>
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center bg-secondary text-muted-foreground">
          <MessageCircle size={30} />
        </div>
        <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
        <p className="mx-auto mt-2 max-w-md text-pretty leading-relaxed text-muted-foreground">
          {t("emptyBody")}
        </p>
        <Button asChild className="mt-6">
          <Link href="/apartments">{t("browseHomes")}</Link>
        </Button>
      </div>
    </div>
  );
}

/* Conversations here are about a listing, not an exchange of files, so the
   composer offers no attachments. This only takes the *button* away — drag,
   drop and paste all bypass it, so the actual switch is the zero upload-slot
   config in chat-provider.tsx's useNoAttachments. Removing the button too
   keeps a dead control (and a tab stop) off the composer. */
const NoAttachmentSelector = () => null;

/* Message actions, minus the thread reply.

   Nested threads are more conversation model than a two-person exchange about
   one apartment needs, and mounting Stream's <Thread /> to serve them would
   put a second composer on screen that ThreadComposer's closed-thread gate
   doesn't cover. Left in place the action is worse than either: `replies` is
   on for the `messaging` channel type, so it renders and does nothing without
   a <Thread /> to open into.

   Filtered from the SDK's own set rather than restated as a literal, so
   actions added by a future release still come through. `quote` is untouched:
   quoted replies compose inline, through the one composer we do gate. */
const messageActionSet = defaultMessageActionSet.filter(
  (action) => !("type" in action) || action.type !== "reply"
);

const MessageActionsWithoutThreads = () => (
  <MessageActions messageActionSet={messageActionSet} />
);

/* The overrides, in the shape <WithComponents> wants. */
export const messagingComponents = {
  AttachmentSelector: NoAttachmentSelector,
  Avatar: MessagingAvatar,
  ChannelListHeader: ConversationsHeader,
  ChannelListItemUI: ConversationRow,
  EmptyStateIndicator: EmptyThread,
  MessageActions: MessageActionsWithoutThreads,
};
