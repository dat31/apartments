"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { ProposeTimeModal } from "./propose-time-modal";
import {
  acceptTourAction,
  declineTourAction,
  proposeTourTimeAction,
} from "@/lib/actions/tours";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";
import { Calendar, Check } from "lucide-react";

/* What an owner can do about one tour request. The only client component in a
   tour card — the card itself, and the list around it, render on the server.

   No optimistic status flip, unlike the listing toggle: the status shows in a
   StatusTag at the top of the card, which the server renders, so an optimistic
   value here would leave the badge and the buttons disagreeing for a moment.
   These are deliberate, one-at-a-time decisions rather than a switch someone
   flicks back and forth, so the buttons disable while the transition runs and
   the refreshed server render is what changes them. */
export function TourActions({
  tour,
  listingTitle,
  template,
  occupied,
}: {
  tour: TourRequest;
  listingTitle: string | null;
  /** The owner's own week — only needed to propose a new time. */
  template: WeekTemplate;
  /** "date|time" keys this owner already holds, this tour's own excluded. */
  occupied: string[];
}) {
  const t = useTranslations("dashboard.tourCard");
  const tt = useTranslations("dashboard.tours");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [proposing, setProposing] = React.useState(false);

  const run = (
    action: () => Promise<{ ok: boolean }>,
    after: () => void
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(tt("actionFailed"));
        return;
      }
      after();
      router.refresh();
    });

  const accept = () =>
    run(() => acceptTourAction(tour.id), () => {
      posthog.capture("tour_accepted", { tour_id: tour.id });
      toast.success(tt("confirmedToast"), {
        description: tt("confirmedToastDesc"),
      });
    });

  const decline = () =>
    run(() => declineTourAction(tour.id), () => {
      posthog.capture("tour_declined", { tour_id: tour.id });
      toast(tt("declinedToast"));
    });

  const propose = (id: string, date: string, time: string) => {
    setProposing(false);
    run(() => proposeTourTimeAction(id, date, time), () => {
      posthog.capture("tour_time_proposed", {
        tour_id: id,
        proposed_date: date,
        proposed_time: time,
      });
      toast.success(tt("proposedToast"), {
        description: tt("proposedToastDesc"),
      });
    });
  };

  if (tour.status === "declined") {
    return <span className="text-sm text-muted-foreground">{t("noAction")}</span>;
  }

  return (
    <>
      {tour.status === "pending" && (
        <>
          <Button size="sm" disabled={pending} onClick={accept}>
            <Check size={16} /> {t("accept")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setProposing(true)}
          >
            <Calendar size={16} /> {t("suggestNewTime")}
          </Button>
        </>
      )}
      {/* One button, three names: declining a request, cancelling a confirmed
          tour and withdrawing a proposal all land in the same terminal state
          (see declineTour in lib/services/tours) — only what the owner is
          walking away from differs. */}
      <Button
        variant="ghost"
        size="sm"
        className="hover:bg-destructive hover:text-destructive-foreground"
        disabled={pending}
        onClick={decline}
      >
        {tour.status === "pending"
          ? t("decline")
          : tour.status === "confirmed"
            ? t("cancelTour")
            : t("withdraw")}
      </Button>

      {/* Remounted per opening so the picker starts empty — the modal has no
          reset effect and relies on fresh state, as it did when the tours tab
          keyed it by the tour being rescheduled. */}
      {proposing && (
        <ProposeTimeModal
          open
          onClose={() => setProposing(false)}
          tour={tour}
          listingTitle={listingTitle}
          template={template}
          occupied={occupied}
          onSubmit={propose}
        />
      )}
    </>
  );
}
