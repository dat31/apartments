"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TourStop } from "../lib/route-plan";
import { TourRouteMapLazy } from "./tour-route-map-lazy";

/* Per-day route section on the renter's tour list: a full-width toggle
   row (icon block, label, collapsed stop-count summary, chevron) that
   mounts the lazy route map below the day's cards. Rendered only for days
   with ≥2 routeable stops. */
export function TourDayRoute({ stops }: { stops: TourStop[] }) {
  const t = useTranslations("tour.route");
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-3 bg-secondary px-4 py-3 text-left text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
          <Route size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {t(open ? "hideRoute" : "viewRoute")}
          </span>
          {!open && (
            <span className="mt-0.5 block text-[13px] text-muted-foreground tabular-nums">
              {t("stopsSummary", { count: stops.length })}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="anim-fade mt-3">
          <TourRouteMapLazy stops={stops} />
        </div>
      )}
    </div>
  );
}
