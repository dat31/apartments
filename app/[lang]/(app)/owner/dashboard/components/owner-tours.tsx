"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OwnerTourCard } from "./owner-tour-card";
import { ProposeTimeModal } from "./propose-time-modal";
import { useOwnerTours, type OwnerTour } from "@/hooks/use-owner-tours";
import { useMyAvailability } from "@/hooks/use-availability";
import { type TourRequest } from "@/schemas/tour";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { Calendar } from "lucide-react";
import { MessagingProvider } from "@/components/messaging/chat-provider";

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
  items: OwnerTour[];
  render: (t: OwnerTour) => React.ReactNode;
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
  const t = useTranslations("dashboard.tours");
  const { items, acceptTour, declineTour, proposeTime } = useOwnerTours();
  const { template } = useMyAvailability();
  const [proposeFor, setProposeFor] = React.useState<TourRequest | null>(null);

  const needsResponse = items
    .filter((m) => m.tour.status === "pending" || m.tour.status === "reschedule")
    .sort((a, b) => sortKey(a.tour).localeCompare(sortKey(b.tour)));
  const upcoming = items
    .filter((m) => m.tour.status === "confirmed")
    .sort((a, b) => sortKey(a.tour).localeCompare(sortKey(b.tour)));
  const past = items.filter((m) => m.tour.status === "declined");

  const handleAccept = (id: string) => {
    acceptTour(id);
    toast.success(t("confirmedToast"), {
      description: t("confirmedToastDesc"),
    });
  };

  const handleDecline = (id: string) => {
    declineTour(id);
    toast(t("declinedToast"));
  };

  const renderCard = (m: OwnerTour) => (
    <OwnerTourCard
      key={m.tour.id}
      tour={m.tour}
      listing={m.listing}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onPropose={setProposeFor}
    />
  );

  if (items.length === 0) {
    return (
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <Calendar size={26} />
        </div>
        <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
        <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
          {t("emptyBody")}
        </p>
      </div>
    );
  }

  return (
    /* One Stream connection for every card's chat panel; children render
       immediately, so the dashboard never waits on the socket. */
    <MessagingProvider>
    <div className="anim-fade">
      <Section title={t("needsResponse")} items={needsResponse} render={renderCard} />
      <Section title={t("upcoming")} items={upcoming} render={renderCard} />
      <Section title={t("past")} items={past} render={renderCard} />

      <ProposeTimeModal
        key={proposeFor?.id ?? "none"}
        open={!!proposeFor}
        onClose={() => setProposeFor(null)}
        tour={proposeFor}
        listing={
          proposeFor
            ? items.find((m) => m.tour.id === proposeFor.id)?.listing ?? null
            : null
        }
        template={template}
        tours={items.map((m) => m.tour)}
        onSubmit={(id, date, time) => {
          proposeTime(id, date, time);
          setProposeFor(null);
          toast.success(t("proposedToast"), {
            description: t("proposedToastDesc"),
          });
        }}
      />
    </div>
    </MessagingProvider>
  );
}
