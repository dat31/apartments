"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { notificationKeys } from "@/hooks/use-notifications";
import { tourKeys } from "@/hooks/use-my-tours";
import {
  acceptRescheduleAction,
  acceptTourAction,
  declineTourAction,
} from "@/lib/actions/tours";
import { type NotificationItem } from "@/schemas/notification";
import { Calendar, Check, X } from "lucide-react";

/* The one decision a notification is actually about, offered on the row.

   Only two rows carry any: the owner's "someone asked to view your home" and
   the renter's "the owner proposed another time". Those are the two the feed
   otherwise sends people elsewhere to answer, and answering them is a single
   unambiguous act. Everything else — cancelling a confirmed tour, proposing a
   third time — stays on the tour surfaces, which show the slot, the note and
   the rest of the week around it.

   Gated on `tourStatus`, read fresh with the feed: a request already accepted
   from the dashboard shows no buttons here, rather than an Accept that fails.
   Suggesting a new time is deliberately not offered — it needs the owner's
   week and an availability picker, so the row links to the dashboard instead.

   No optimistic flip, for the reason TourActions gives on the dashboard:
   these are one-at-a-time decisions, so the buttons disable while the write
   runs and the refetched feed is what removes them. */
export function NotificationTourActions({
  notification,
  onDone,
}: {
  notification: NotificationItem;
  /** Marks the row read alongside the write — answering a request is as much
      a reading of it as clicking through would be. */
  onDone: () => void;
}) {
  const t = useTranslations("notifications.actions");
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();

  const { tourId, tourStatus, kind } = notification;

  const run = (action: () => Promise<{ ok: boolean }>, after: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      after();
      onDone();
      /* Both caches: the tour moved, and so did the news about it — the feed
         row loses its buttons only once the server agrees the tour is no
         longer pending. */
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
    });

  if (!tourId) return null;

  /* An owner's pending request. */
  if (kind === "tour_requested" && tourStatus === "pending") {
    return (
      <div className="relative z-20 mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => acceptTourAction(tourId), () => {
              posthog.capture("tour_accepted", {
                tour_id: tourId,
                surface: "notifications",
              });
              toast.success(t("acceptedToast"));
            })
          }
        >
          <Check size={15} /> {t("accept")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-destructive hover:text-destructive-foreground"
          disabled={pending}
          onClick={() =>
            run(() => declineTourAction(tourId), () => {
              posthog.capture("tour_declined", {
                tour_id: tourId,
                surface: "notifications",
              });
              toast(t("declinedToast"));
            })
          }
        >
          <X size={15} /> {t("decline")}
        </Button>
      </div>
    );
  }

  /* A renter looking at a slot the owner proposed. */
  if (kind === "tour_reschedule_proposed" && tourStatus === "reschedule") {
    return (
      <div className="relative z-20 mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => acceptRescheduleAction(tourId), () => {
              posthog.capture("tour_reschedule_accepted", {
                tour_id: tourId,
                surface: "notifications",
              });
              toast.success(t("newTimeAcceptedToast"));
            })
          }
        >
          <Calendar size={15} /> {t("acceptNewTime")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-destructive hover:text-destructive-foreground"
          disabled={pending}
          onClick={() =>
            run(() => declineTourAction(tourId), () => {
              posthog.capture("tour_declined", {
                tour_id: tourId,
                surface: "notifications",
              });
              toast(t("declinedToast"));
            })
          }
        >
          <X size={15} /> {t("decline")}
        </Button>
      </div>
    );
  }

  return null;
}
