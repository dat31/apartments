"use client";

import * as React from "react";
import { toast } from "sonner";
import { OwnerTourCard } from "./owner-tour-card";
import { ProposeTimeModal } from "./propose-time-modal";
import { useListings } from "@/hooks/use-listings";
import { useTours } from "@/hooks/use-tours";
import { useAvailability } from "@/hooks/use-availability";
import { type TourRequest } from "@/schemas/tour";
import { tourSlot } from "@/app/(app)/apartments/[id]/constants/tours";
import { Calendar } from "lucide-react";

const sortKey = (t: TourRequest) => {
  const s = tourSlot(t);
  return `${s.date}|${s.time}`;
};

function Section({
  title,
  items,
  render,
}: {
  title: string;
  items: TourRequest[];
  render: (t: TourRequest) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 stagger">{items.map(render)}</div>
    </div>
  );
}

export function OwnerTours() {
  const { getById } = useListings();
  const { tours, acceptTour, declineTour, proposeTime } = useTours();
  const { template } = useAvailability();
  const [proposeFor, setProposeFor] = React.useState<TourRequest | null>(null);

  const mine = tours.filter((t) => t.ownerKey === "you");
  const needsResponse = mine
    .filter((t) => t.status === "pending" || t.status === "reschedule")
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const upcoming = mine
    .filter((t) => t.status === "confirmed")
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = mine.filter((t) => t.status === "declined");

  const handleAccept = (id: string) => {
    acceptTour(id);
    toast.success("Tour confirmed", {
      description: "We let the renter know it's on.",
    });
  };

  const handleDecline = (id: string) => {
    declineTour(id);
    toast("Tour declined");
  };

  const renderCard = (t: TourRequest) => (
    <OwnerTourCard
      key={t.id}
      tour={t}
      listing={getById(t.listingId) ?? null}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onPropose={setProposeFor}
    />
  );

  if (mine.length === 0) {
    return (
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <Calendar size={26} />
        </div>
        <h3 className="text-lg font-semibold">No tour requests yet</h3>
        <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
          When renters request a viewing, they&apos;ll show up here for you to
          accept, decline, or reschedule.
        </p>
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <Section title="Needs your response" items={needsResponse} render={renderCard} />
      <Section title="Upcoming tours" items={upcoming} render={renderCard} />
      <Section title="Past & declined" items={past} render={renderCard} />

      <ProposeTimeModal
        key={proposeFor?.id ?? "none"}
        open={!!proposeFor}
        onClose={() => setProposeFor(null)}
        tour={proposeFor}
        listing={proposeFor ? getById(proposeFor.listingId) ?? null : null}
        template={template}
        tours={tours}
        onSubmit={(id, date, time) => {
          proposeTime(id, date, time);
          setProposeFor(null);
          toast.success("New time proposed", {
            description: "The renter can accept or decline your suggestion.",
          });
        }}
      />
    </div>
  );
}
