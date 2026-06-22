"use client";

import { useEffect, useState } from "react";
import {
  availabilityFor,
  type WeekTemplate,
} from "@/app/(app)/apartments/[id]/constants/tours";

const KEY = "danapa-availability";

/* The owner's editable weekly tour-availability template. Seeded from the
   static default for the owner and persisted to localStorage. */
export function useAvailability(ownerKey = "you") {
  const [template, setTemplate] = useState<WeekTemplate>(() =>
    availabilityFor(ownerKey)
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTemplate(JSON.parse(s));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(template));
    } catch {}
  }, [template, ready]);

  return { template, setTemplate, ready };
}
