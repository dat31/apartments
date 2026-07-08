"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type TourStop } from "../lib/route-plan";
import { TourRouteMapLazy } from "./tour-route-map-lazy";

/* Per-day route section on the renter's tour list: a "View route" toggle
   that mounts the lazy route map (and its leg list) below the day's cards.
   Rendered only for days with ≥2 routeable stops. */
export function TourDayRoute({ stops }: { stops: TourStop[] }) {
  const t = useTranslations("tour.route");
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-3">
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Route size={16} /> {t(open ? "hideRoute" : "viewRoute")}
      </Button>
      {open && (
        <div className="mt-3 anim-fade">
          <TourRouteMapLazy stops={stops} />
        </div>
      )}
    </div>
  );
}
