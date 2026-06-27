"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { type TourRequest, tourRequestSchema } from "@/schemas/tour";
import { seedTours } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

const KEY = "danapa-tours";

/* Persisted tours — shared by the renter booking flow and the owner
   dashboard. On first visit (nothing stored) it seeds a few example requests
   so the owner's tour surface isn't empty. */
export function useTours() {
  const [tours, setTours] = useState<TourRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const parsed = z.array(tourRequestSchema).safeParse(JSON.parse(s));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.success) setTours(parsed.data);
      } else {
        setTours(seedTours());
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(tours));
    } catch {}
  }, [tours, ready]);

  const addTour = useCallback(
    (tour: Omit<TourRequest, "id" | "status" | "createdAt">) => {
      const full: TourRequest = {
        ...tour,
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `t${Date.now()}`,
        status: "pending",
        createdAt: Date.now(),
      };
      setTours((t) => [...t, full]);
      return full;
    },
    []
  );

  const acceptTour = useCallback((id: string) => {
    setTours((ts) =>
      ts.map((t) => (t.id === id ? { ...t, status: "confirmed" } : t))
    );
  }, []);

  const declineTour = useCallback((id: string) => {
    setTours((ts) =>
      ts.map((t) => (t.id === id ? { ...t, status: "declined" } : t))
    );
  }, []);

  /* Renter accepts the owner's proposed slot — adopt it as the real
     date/time and confirm the tour. */
  const acceptReschedule = useCallback((id: string) => {
    setTours((ts) =>
      ts.map((t) =>
        t.id === id && t.status === "reschedule" && t.proposedDate && t.proposedTime
          ? {
              ...t,
              status: "confirmed",
              date: t.proposedDate,
              time: t.proposedTime,
              proposedDate: undefined,
              proposedTime: undefined,
            }
          : t
      )
    );
  }, []);

  const proposeTime = useCallback(
    (id: string, date: string, time: string) => {
      setTours((ts) =>
        ts.map((t) =>
          t.id === id
            ? { ...t, status: "reschedule", proposedDate: date, proposedTime: time }
            : t
        )
      );
    },
    []
  );

  return {
    tours,
    addTour,
    acceptTour,
    acceptReschedule,
    declineTour,
    proposeTime,
    ready,
  };
}
