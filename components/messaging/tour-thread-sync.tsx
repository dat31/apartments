"use client";

import * as React from "react";
import { ensureTourChannel } from "@/lib/actions/tour-chat";
import { type TourRequest } from "@/schemas/tour";

/* Freeze state is server-owned, but the events that change it happen on the
   client: an owner declines a tour, a renter accepts a proposed slot. This
   renders nothing and re-runs the provisioning action whenever the tour's
   status or effective slot changes, so the thread freezes, unfreezes and
   re-dates itself without a page reload. */
export function TourThreadSync({ tour }: { tour: TourRequest }) {
  const signature = [
    tour.status,
    tour.date,
    tour.time,
    tour.proposedDate ?? "",
    tour.proposedTime ?? "",
  ].join("|");

  const lastSynced = React.useRef<string | null>(null);

  React.useEffect(() => {
    /* Skip the first observation: the panel provisions lazily when it is
       opened, so firing here as well would mean one server action per tour on
       every page load. Only a *change* is news. */
    if (lastSynced.current === null || lastSynced.current === signature) {
      lastSynced.current = signature;
      return;
    }
    lastSynced.current = signature;
    void ensureTourChannel(tour.id).catch(() => {});
  }, [signature, tour.id]);

  return null;
}
