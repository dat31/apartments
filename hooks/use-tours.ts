"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { type TourRequest, tourRequestSchema } from "@/app/(app)/apartments/[id]/schemas/tour";

const KEY = "danapa-tours";

/* Persisted list of the renter's requested tours. */
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

  return { tours, addTour, ready };
}
