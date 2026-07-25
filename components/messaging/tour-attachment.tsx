"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Attachment as DefaultAttachment, type AttachmentProps } from "stream-chat-react";
import { Calendar, Clock } from "lucide-react";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { StatusTag } from "@/components/status-tag";
import { type TourRequest } from "@/schemas/tour";
import { type TourAttachment, isTourAttachment } from "@/lib/stream/tour-attachment";

/* ============================================================
   Rendering a tour attachment inside a message bubble.

   Registered as the `Attachment` override (stream-components.tsx): a message
   can carry text plus a tour, so this splits the attachments — tour cards are
   ours, everything else falls through to the SDK's own <Attachment>, which
   keeps its image / file / giphy handling intact for any future type.
   ============================================================ */

/* Locale-aware slot formatting, mirroring the tour cards (renter-tour-card):
   the effective slot was already snapshotted onto the attachment, so this
   only formats the strings for display. */
function useSlotFormat() {
  const format = useFormatter();
  const fmtDateLong = (date: string) =>
    format.dateTime(parseYmd(date), {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  return { fmtDateLong, fmtTime };
}

export function TourAttachmentCard({ attachment }: { attachment: TourAttachment }) {
  const t = useTranslations("messaging");
  const { fmtDateLong, fmtTime } = useSlotFormat();
  const status = (attachment.tour_status ?? "pending") as TourRequest["status"];

  return (
    /* The `str-chat__tour-attachment` marker lets stream-theme.css strip the
       enclosing message bubble's background/border (see the `:has()` rule) so
       the card reads as a free-standing surface, not framed by the bubble.
       `text-foreground` resets the message's inherited `--chat-text` (which is
       primary-foreground on own messages) so the date line stays readable. */
    <div className="str-chat__tour-attachment mb-1 w-72 max-w-full bg-muted text-foreground">
      <div className="flex items-center gap-2 px-3 py-2">
        <Calendar size={16} className="shrink-0 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("tourRequest")}
        </span>
        <span className="ml-auto">
          <StatusTag status={status} />
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium leading-snug">
          {fmtDateLong(attachment.tour_date)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock size={14} className="text-primary" /> {fmtTime(attachment.tour_time)}
        </p>
        {attachment.tour_note && (
          <p className="mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">
            &ldquo;{attachment.tour_note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export function MessagingAttachment(props: AttachmentProps) {
  const tourAttachments: TourAttachment[] = [];
  const rest: AttachmentProps["attachments"] = [];

  for (const attachment of props.attachments) {
    if (isTourAttachment(attachment)) tourAttachments.push(attachment);
    else rest.push(attachment);
  }

  return (
    <>
      {tourAttachments.map((attachment) => (
        <TourAttachmentCard key={attachment.tour_id} attachment={attachment} />
      ))}
      {rest.length > 0 && <DefaultAttachment {...props} attachments={rest} />}
    </>
  );
}
