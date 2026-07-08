"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";

/* Presentational list of the day's route legs — one row per drive between
   consecutive stops, a total row, and the Google Maps hand-off link. When
   OSRM is down the parent passes straight-line estimates: distances only,
   no drive times, plus a retry affordance. */

export type RouteLeg = {
  from: string;
  to: string;
  km: number;
  /** Drive time — absent on the straight-line fallback. */
  minutes?: number;
};

export function RouteLegs({
  legs,
  totalKm,
  totalMinutes,
  href,
  estimated,
  onRetry,
}: {
  legs: RouteLeg[];
  totalKm: number;
  totalMinutes?: number;
  /** Google Maps directions URL through every point in order. */
  href: string;
  /** True when OSRM failed and the numbers are straight-line estimates. */
  estimated?: boolean;
  onRetry?: () => void;
}) {
  const t = useTranslations("tour.route");
  const format = useFormatter();

  const metric = (km: number, minutes?: number) => (
    <span className="shrink-0 tabular-nums">
      {formatDistance(format, km)}
      {typeof minutes === "number" && <> · {t("minutes", { minutes })}</>}
    </span>
  );

  return (
    <div className="mt-3">
      {estimated && (
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <TriangleAlert size={15} className="shrink-0" /> {t("routeError")}
          {onRetry && (
            <Button variant="ghost" size="sm" className="h-7" onClick={onRetry}>
              {t("retry")}
            </Button>
          )}
        </p>
      )}
      <ol className="divide-y divide-border border border-border bg-card text-sm">
        {legs.map((leg, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {t("leg", { from: leg.from, to: leg.to })}
            </span>
            {metric(leg.km, leg.minutes)}
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-3 py-2 font-medium">
          <span>{t("total")}</span>
          {metric(totalKm, totalMinutes)}
        </li>
      </ol>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-ring"
      >
        {t("openInGoogleMaps")} <ExternalLink size={14} />
      </a>
    </div>
  );
}
