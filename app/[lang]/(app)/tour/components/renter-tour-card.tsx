"use client";

import Image from "next/image";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/status-tag";
import { PALETTE } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { type TourRequest } from "@/schemas/tour";
import {
  parseYmd,
  isPastSlot,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import {
  Calendar,
  Check,
  CircleCheck,
  Clock,
  MapPin,
} from "lucide-react";
import { AddToCalendar } from "./add-to-calendar";
import { TourChatPanel } from "@/components/messaging/tour-chat-panel";

/* One of the renter's own tour requests, with the actions available for its
   current status. Mirrors the owner card but from the renter's side. */
export function RenterTourCard({
  tour,
  listing,
  onAcceptNew,
  onDecline,
  onCancel,
}: {
  tour: TourRequest;
  listing: Listing | null;
  onAcceptNew: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const t = useTranslations("tour");
  const format = useFormatter();
  const fmtDateLong = (s: string) =>
    format.dateTime(parseYmd(s), {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const fmtDateMed = (s: string) =>
    format.dateTime(parseYmd(s), {
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
  const cover = listing?.images?.[0];
  const color = listing ? PALETTE[listing.palette][0] : "var(--muted)";

  return (
    <div className="bg-card relative flex flex-col sm:flex-row anim-up transition-colors hover:bg-accent/40">
      {listing && (
        <Link
          href={`/apartments/${listing.id}`}
          aria-label={listing.title}
          className="absolute inset-0 z-10 focus-ring"
        />
      )}

      <div className="sm:w-52 shrink-0 overflow-hidden sm:self-stretch">
        <div className="relative aspect-[16/9] sm:aspect-auto sm:h-full">
          {cover ? (
            <Image
              src={cover}
              alt={listing?.title ?? ""}
              fill
              sizes="(min-width: 640px) 13rem, 100vw"
              className="object-cover"
              unoptimized={cover.startsWith("data:")}
            />
          ) : (
            <span className="absolute inset-0" style={{ background: color }} />
          )}
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusTag status={tour.status} />
            </div>
            <h3 className="font-semibold tracking-tight truncate">
              {listing ? listing.title : t("listingRemoved")}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin size={14} /> {listing ? districtLabel(listing.district) : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 text-sm font-medium">
            <Calendar size={15} className="text-primary" /> {fmtDateMed(tour.date)}
            <span className="text-muted-foreground">·</span>
            <Clock size={15} className="text-primary" /> {fmtTime(tour.time)}
          </div>
        </div>

        {tour.status === "pending" && (
          <p className="text-sm text-muted-foreground">
            {t("statusPending")}
          </p>
        )}
        {tour.status === "confirmed" && (
          <p className="text-sm text-primary font-medium flex items-center gap-1.5">
            <CircleCheck size={16} /> {t("statusConfirmed")}
          </p>
        )}
        {tour.status === "declined" && (
          <p className="text-sm text-muted-foreground">
            {t("statusDeclined")}
          </p>
        )}
        {tour.status === "reschedule" && tour.proposedDate && tour.proposedTime && (
          <div className="bg-accent text-accent-foreground p-3">
            <p className="text-sm font-medium">{t("proposedTitle")}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Calendar size={15} /> {fmtDateLong(tour.proposedDate)}
              <span className="opacity-70">{t("at")}</span>
              <Clock size={15} /> {fmtTime(tour.proposedTime)}
            </p>
          </div>
        )}

        <div className="relative z-20 flex flex-wrap items-center gap-2 mt-auto">
          {tour.status === "confirmed" &&
            listing &&
            !isPastSlot(tour.date, tour.time) && (
              <AddToCalendar tour={tour} listing={listing} />
            )}
          {tour.status === "reschedule" && (
            <>
              <Button size="sm" onClick={() => onAcceptNew(tour.id)}>
                <Check size={16} /> {t("acceptNewTime")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onDecline(tour.id)}
              >
                {t("decline")}
              </Button>
            </>
          )}
          {(tour.status === "pending" || tour.status === "confirmed") && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onCancel(tour.id)}
            >
              {t("cancelTour")}
            </Button>
          )}
        </div>

        {/* Sits above the card-wide listing link (z-10) so the thread stays
            interactive instead of navigating to the listing on every click. */}
        <div className="relative z-20 border-t border-border pt-2">
          <TourChatPanel tour={tour} />
        </div>
      </div>
    </div>
  );
}
