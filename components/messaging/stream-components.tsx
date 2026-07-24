"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChannelListItemTimestamp,
  useChatContext,
  type AvatarProps,
  type ChannelListItemUIProps,
  type EmptyStateIndicatorProps,
} from "stream-chat-react";
import type { StreamChat } from "stream-chat";
import { Check, MessageSquareText, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { PALETTE } from "@/lib/data/listings";
import { useProfile } from "@/hooks/use-profile";
import { MessagingAttachment } from "./tour-attachment";
import {
  TourAttachmentPreviewList,
  TourAttachmentSelector,
} from "./tour-attachment-composer";

/* ============================================================
   The three regions where the design is structurally different from
   Stream's prebuilt UI. Everything else — bubbles, day separators,
   composer, typing dots — is reached by theming alone (stream-theme.css),
   so no custom MessageUI or composer exists here: replacing those would
   mean re-implementing reactions, quoted replies, deleted/edited states
   and thread counts to get a layout CSS already reaches.

   Registered once by MessagingProvider via <WithComponents>, so the inbox
   and the inline tour threads render identically.
   ============================================================ */

/* Avatars are the app's square colour blocks, never photos. Stream hands the
   avatar only a display name, an image URL and the user id — the palette
   index lives on the Stream user record (see lib/stream/server.ts), so it is
   read back out of the client's user cache and falls back to a name hash for
   anyone not cached yet. */
const AVATAR_PX: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
  "2xl": 64,
};

const nameHashPalette = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % PALETTE.length;
};

function paletteFor(client: StreamChat, id: string | undefined, name: string) {
  const cached = id ? client.state.users[id] : undefined;
  return cached?.palette ?? nameHashPalette(name);
}

/* Only four props are read. `imageUrl`, `initials`, `isOnline` and
   `FallbackIcon` are deliberately dropped — the design has no photo avatars
   and shows no presence — and the rest are not spread onto the DOM, so the
   SDK's own `id`/`data-testid` can't leak through as element attributes.
   `id` here is the Stream user id, which extractDisplayInfo passes along. */
function MessagingAvatar({ className, id, size, userName }: AvatarProps) {
  const { client } = useChatContext("MessagingAvatar");
  const name = userName || "";
  const px = (typeof size === "string" && AVATAR_PX[size]) || 40;

  return (
    <span className={cn("shrink-0", className)}>
      <ProfileAvatar name={name} palette={paletteFor(client, id, name)} size={px} />
    </span>
  );
}

/* The design's conversation row: square avatar, name + verified check, the
   listing on its own line, a "You: " preview prefix and an unread chip.

   Completion contract (references/custom-ui.md — custom channel preview):
   • display name .......... `displayTitle` (SDK-computed)
   • last message + sender . `latestMessagePreview` (SDK-computed; already
                             covers attachment / deleted fallbacks) + our own
                             "You:" prefix for own messages
   • last-message time ..... <ChannelListItemTimestamp/>
   • unread badge .......... `unread` prop
   • active/selected ....... `active` + onSelect ?? setActiveChannel
   • avatar ................ the Avatar override above
   • online presence ....... N/A — presence is not part of this product's
                             design language; avatars are colour blocks and
                             no surface in the app shows online state
   • muted/pinned/archived . N/A — these two-party threads expose no channel
                             actions, so none of those states can be set */
function ConversationRow({
  active,
  channel,
  displayTitle,
  lastMessage,
  latestMessagePreview,
  onSelect,
  setActiveChannel,
  unread,
  watchers,
}: ChannelListItemUIProps) {
  const t = useTranslations("messaging");
  const { client } = useChatContext("ConversationRow");

  const name = displayTitle || "";
  const other = Object.values(channel.state.members).find(
    (member) => member.user_id !== client.userID
  )?.user;
  const listingTitle = channel.data?.listing_title;
  const mine = !!lastMessage?.user?.id && lastMessage.user.id === client.userID;

  const handleSelect = (event: React.MouseEvent) => {
    if (onSelect) onSelect(event);
    else setActiveChannel?.(channel, watchers);
  };

  return (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={handleSelect}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors focus-ring",
        active ? "bg-secondary" : "hover:bg-muted"
      )}
    >
      <ProfileAvatar
        name={name}
        palette={paletteFor(client, other?.id, name)}
        size={44}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 truncate font-medium">
            {name}
            {other?.verified && (
              <Check size={13} className="shrink-0 text-primary" />
            )}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 text-xs tabular-nums",
              unread ? "font-medium text-primary" : "text-muted-foreground"
            )}
          >
            <ChannelListItemTimestamp lastMessage={lastMessage} />
          </span>
        </div>

        {listingTitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {listingTitle}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2">
          {/* A span, not a <p>: for a plain text message the SDK renders
              `latestMessagePreview` through react-markdown, which emits its
              own <p>. Nesting that in a paragraph is invalid HTML and React
              flags it as a hydration error. */}
          <span
            className={cn(
              // [&_p]:inline pulls that markdown paragraph into this line box,
              // so `truncate`'s ellipsis still applies to the preview text.
              "block min-w-0 flex-1 truncate text-sm [&_p]:inline",
              unread ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {mine && <span>{t("youPrefix")} </span>}
            {latestMessagePreview}
          </span>
          {!!unread && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center bg-primary px-1 text-xs font-semibold tabular-nums text-primary-foreground">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* Role-aware empty copy: a renter with no threads is told to browse, an owner
   is told replies will land here. `listType` distinguishes an empty inbox from
   an empty thread.

   The empty inbox is a full-bleed card in the design, not a note inside the
   300px list column — so it carries `data-inbox-empty`, which inbox.tsx keys a
   `:has()` rule off to collapse the two-pane grid to one column. */
function MessagingEmptyState({ listType }: EmptyStateIndicatorProps) {
  const t = useTranslations("messaging");
  const { profile } = useProfile();
  const isOwner = profile.role === "owner";

  if (listType === "channel") {
    return (
      <div
        data-inbox-empty=""
        className="bg-card p-12 text-center anim-fade sm:p-16"
      >
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center bg-secondary text-muted-foreground">
          <MessageSquareText size={30} />
        </div>
        <h3 className="text-lg font-semibold">{t("emptyInboxTitle")}</h3>
        <p className="mx-auto mt-2 max-w-md text-pretty leading-relaxed text-muted-foreground">
          {isOwner ? t("emptyInboxOwner") : t("emptyInboxRenter")}
        </p>
        {!isOwner && (
          <Button asChild className="mt-6 gap-1.5">
            <Link href="/apartments">
              <Search size={17} /> {t("browseHomes")}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <p className="text-sm text-muted-foreground">{t("emptyThread")}</p>
    </div>
  );
}

/* The composer's only attachment kind is a tour (see tour-attachment-composer):
   the picker replaces the SDK's default AttachmentSelector, so the prebuilt
   attachment menu — file upload, polls, location, and the `giphy` command that
   kept that menu alive under `uploads: false` — never renders. This hides the
   entry point, not the command: `/giphy` typed into the field still resolves
   until the command is dropped from the channel type.

   The three tour slots:
   • Attachment ............ renders a sent tour as a card, delegating any other
                             attachment type to the SDK's own <Attachment>.
   • AttachmentSelector .... the picker button + tour menu.
   • AttachmentPreviewList . the staged "Tour attached" chip. */
export const messagingComponents = {
  Avatar: MessagingAvatar,
  Attachment: MessagingAttachment,
  AttachmentSelector: TourAttachmentSelector,
  AttachmentPreviewList: TourAttachmentPreviewList,
  ChannelListItemUI: ConversationRow,
  EmptyStateIndicator: MessagingEmptyState,
};
