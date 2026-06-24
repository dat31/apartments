"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/status-tag";
import { type Listing, PALETTE } from "@/lib/data/listings";
import { type TourRequest } from "@/app/(app)/apartments/[id]/schemas/tour";
import {
  tourDateMed,
  tourSlot,
  tourTimeLabel,
} from "@/app/(app)/apartments/[id]/constants/tours";
import {
  Calendar,
  CalendarClock,
  Check,
  Clock,
  MessageSquare,
  User,
  Users,
} from "lucide-react";

/* One incoming tour request with the owner's available actions. */
export function OwnerTourCard({
  tour,
  listing,
  onAccept,
  onDecline,
  onPropose,
}: {
  tour: TourRequest;
  listing: Listing | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onPropose: (tour: TourRequest) => void;
}) {
  const slot = tourSlot(tour);
  const cover = listing?.images?.[0];
  const color = listing ? PALETTE[listing.palette][0] : "var(--muted)";

  return (
    <div className="bg-card flex flex-col sm:flex-row anim-up">
      <div className="sm:w-32 shrink-0">
        <div className="relative h-24 sm:h-full overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={listing?.title ?? ""}
              fill
              sizes="(min-width: 640px) 8rem, 100vw"
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
              {listing ? listing.title : "Listing removed"}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <User size={14} /> {tour.renterName} · {tour.renterEmail}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 text-sm font-medium">
            <Calendar size={15} className="text-primary" /> {tourDateMed(slot.date)}
            <span className="text-muted-foreground">·</span>
            <Clock size={15} className="text-primary" /> {tourTimeLabel(slot.time)}
          </div>
        </div>

        {(tour.moveIn || tour.people) && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {tour.moveIn && (
              <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5">
                <CalendarClock size={14} className="text-primary" /> Move-in{" "}
                {tourDateMed(tour.moveIn)}
              </span>
            )}
            {tour.people && (
              <span className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1.5">
                <Users size={14} className="text-primary" /> {tour.people}{" "}
                {tour.people === "1" ? "person" : "people"}
              </span>
            )}
          </div>
        )}
        {tour.note && (
          <p className="text-sm text-muted-foreground bg-muted px-3 py-2 text-pretty">
            <MessageSquare
              size={14}
              className="inline mr-1.5 -mt-0.5 text-primary"
            />
            {tour.note}
          </p>
        )}
        {tour.status === "reschedule" && (
          <p className="text-sm text-muted-foreground">
            You proposed a new time — waiting for{" "}
            {tour.renterName.split(/\s+/)[0]} to respond.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-auto">
          {tour.status === "pending" && (
            <>
              <Button size="sm" onClick={() => onAccept(tour.id)}>
                <Check size={16} /> Accept
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPropose(tour)}
              >
                <Calendar size={16} /> Suggest new time
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onDecline(tour.id)}
              >
                Decline
              </Button>
            </>
          )}
          {tour.status === "confirmed" && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onDecline(tour.id)}
            >
              Cancel tour
            </Button>
          )}
          {tour.status === "reschedule" && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onDecline(tour.id)}
            >
              Withdraw
            </Button>
          )}
          {tour.status === "declined" && (
            <span className="text-sm text-muted-foreground">
              No further action.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
