"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  useAttachmentManagerState,
  useChannelStateContext,
  useChatContext,
  useMessageComposerController,
} from "stream-chat-react";
import type { MessageComposer } from "stream-chat";
import { Calendar, CalendarPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusTag } from "@/components/status-tag";
import { useProfile } from "@/hooks/use-profile";
import { useAttachableTours } from "@/hooks/use-attachable-tours";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";
import {
  buildTourAttachment,
  isTourAttachment,
} from "@/lib/stream/tour-attachment";

/* ============================================================
   The "attach a tour" affordance in the composer.

   Two SDK slots (registered in stream-components.tsx):
   • AttachmentSelector    → the far-left picker button + tour menu. Picking a
                             tour stages it on the composer's attachmentManager
                             so it rides on the next send alongside any text.
   • AttachmentPreviewList → the "Tour attached" chip above the field.

   A staged tour is marked `uploadState: "finished"` so the SDK composes it
   into the outgoing message (the attachment-composition middleware only picks
   up finished uploads) and enables the send button even with an empty field —
   matching the design, where a tour can be sent on its own. Nothing is
   actually uploaded: the file-upload path is never touched.
   ============================================================ */

type Manager = MessageComposer["attachmentManager"];
type StagedAttachment = Parameters<Manager["upsertAttachments"]>[0][number];

/* One tour at a time (the design stages a single tour): the new pick replaces
   any tour already staged, leaving other attachment kinds untouched. */
function stageTour(manager: Manager, tour: TourRequest) {
  const existingTourIds = manager.attachments
    .filter((attachment) => isTourAttachment(attachment))
    .map((attachment) => attachment.localMetadata.id);
  if (existingTourIds.length) manager.removeAttachments(existingTourIds);

  const staged = {
    ...buildTourAttachment(tour),
    localMetadata: { id: `tour-${tour.id}`, uploadState: "finished" as const },
  } as unknown as StagedAttachment;
  manager.upsertAttachments([staged]);
}

/** The other party in a two-member thread — their Stream id is the counterpart
    the attachable tours are scoped to. */
function useOtherMemberId(): string | undefined {
  const { client } = useChatContext("TourAttachmentSelector");
  const { channel } = useChannelStateContext("TourAttachmentSelector");
  return Object.values(channel.state.members).find(
    (member) => member.user_id !== client.userID
  )?.user_id;
}

export function TourAttachmentSelector() {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const { channel } = useChannelStateContext("TourAttachmentSelector");
  const composer = useMessageComposerController();
  const { profile } = useProfile();
  const [open, setOpen] = React.useState(false);

  const listingId = channel.data?.listing_id;
  const otherId = useOtherMemberId();
  const { tours } = useAttachableTours(listingId, otherId);
  const isOwner = profile.role === "owner";

  // No listing context → nothing to attach; render nothing (keeps the giphy /
  // upload menu that used to live in this slot hidden, as before).
  if (!listingId) return null;

  const fmtDateMed = (date: string) =>
    format.dateTime(parseYmd(date), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const pick = (tour: TourRequest) => {
    stageTour(composer.attachmentManager, tour);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("attachTourAria")}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors focus-ring",
            open
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <CalendarPlus size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-72 rounded-none p-0"
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {isOwner ? t("referenceTour") : t("attachTour")}
          </p>
        </div>
        {tours.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center bg-secondary text-muted-foreground">
              <Calendar size={19} />
            </div>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {isOwner ? t("noToursOwner") : t("noToursRenter")}
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto py-1">
            {tours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => pick(tour)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-ring"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-secondary text-primary">
                  <Calendar size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">
                    {fmtDateMed(tourEffectiveDate(tour))} · {fmtTime(tourEffectiveTime(tour))}
                  </span>
                  {channel.data?.listing_title && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {channel.data.listing_title}
                    </span>
                  )}
                </span>
                <span className="shrink-0">
                  <StatusTag status={tour.status} />
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* The effective slot (proposed time wins for a rescheduled tour), inlined here
   to keep the menu row readable without importing the whole tourSlot shape. */
function tourEffectiveDate(tour: TourRequest) {
  return tour.status === "reschedule" && tour.proposedDate
    ? tour.proposedDate
    : tour.date;
}
function tourEffectiveTime(tour: TourRequest) {
  return tour.status === "reschedule" && tour.proposedTime
    ? tour.proposedTime
    : tour.time;
}

/* The staged "Tour attached" chip above the field. Uploads are off on this
   channel type, so the only staged attachments are tours; anything else is
   ignored here rather than rendered through the upload preview UI. */
export function TourAttachmentPreviewList() {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const composer = useMessageComposerController();
  const { attachments } = useAttachmentManagerState();

  const staged = attachments.filter((attachment) => isTourAttachment(attachment));
  if (staged.length === 0) return null;

  const fmtDateMed = (date: string) =>
    format.dateTime(parseYmd(date), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {staged.map((attachment) => (
        <div
          key={attachment.localMetadata.id}
          className="flex items-center gap-3 bg-secondary p-2.5"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <Calendar size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
              {t("tourAttached")}
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {fmtDateMed(attachment.tour_date ?? "")} · {fmtTime(attachment.tour_time ?? "00:00")}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("removeAttachedTour")}
            onClick={() =>
              composer.attachmentManager.removeAttachments([
                attachment.localMetadata.id,
              ])
            }
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-ring"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
