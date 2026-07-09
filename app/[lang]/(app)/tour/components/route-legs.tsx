"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";
import { RouteStopBadge } from "./route-stop-badge";
import { RouteUserBadge } from "./route-user-badge";

/* Timeline of the day's route: every point (the renter, then each stop in
   the active order) is a node on a vertical spine, and each drive is the
   labelled connector between two nodes. Connector i is leg i — hovering it
   highlights the matching polyline and endpoint pins on the map. When OSRM
   is down the parent passes straight-line estimates: distances only, no
   drive times or tight-gap flags. */

/** A node on the route: the renter's location or a numbered schedule stop. */
export type RoutePoint = { kind: "user" } | { kind: "stop"; n: number };

export type RouteLeg = {
  km: number;
  /** Drive time — absent on the straight-line fallback. */
  minutes?: number;
  /** Set when the drive takes longer than the free time between the two
      tours (gap already clamped to ≥0 for display). */
  tightGap?: { gap: number; drive: number };
};

const pointKey = (p: RoutePoint) => (p.kind === "user" ? "user" : `s${p.n}`);

export function RouteLegs({
  points,
  legs,
  totalKm,
  totalMinutes,
  href,
  hovered,
  onHover,
}: {
  points: RoutePoint[];
  /** legs[i] connects points[i] → points[i + 1]. */
  legs: RouteLeg[];
  totalKm: number;
  totalMinutes?: number;
  /** Google Maps directions URL through every point in order. */
  href: string;
  /** Index of the leg currently highlighted on the map, if any. */
  hovered: number | null;
  onHover: (leg: number | null) => void;
}) {
  const t = useTranslations("tour.route");
  const format = useFormatter();

  const metric = (km: number, minutes?: number) => (
    <span className="tabular-nums">
      {formatDistance(format, km)}
      {typeof minutes === "number" && <> · {t("minutes", { minutes })}</>}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card p-4 text-sm">
        <ol className="flex flex-col">
          {points.map((p, i) => (
            <li key={pointKey(p)}>
              <div className="flex items-center gap-3 py-1.5">
                {p.kind === "user" ? (
                  <RouteUserBadge size={26} />
                ) : (
                  <RouteStopBadge n={p.n} size={26} />
                )}
                <span className="min-w-0 truncate font-medium">
                  {p.kind === "user" ? t("yourLocation") : t("stop", { n: p.n })}
                </span>
              </div>
              {i < legs.length && (
                <div
                  className={cn(
                    "-my-0.5 ml-[13px] border-l-2 py-2 pl-6 transition-colors",
                    legs[i].tightGap ? "border-destructive" : "border-border",
                    hovered === i && "bg-accent/50"
                  )}
                  onMouseEnter={() => onHover(i)}
                  onMouseLeave={() => onHover(null)}
                >
                  <span
                    className={cn(
                      "flex items-center gap-2",
                      legs[i].tightGap
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {metric(legs[i].km, legs[i].minutes)}
                    {legs[i].tightGap && (
                      <TriangleAlert size={13} className="shrink-0" />
                    )}
                  </span>
                  {legs[i].tightGap && (
                    <p className="mt-1 text-xs leading-snug font-medium text-destructive">
                      {t("tightGap", legs[i].tightGap)}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-3 font-medium">
          <span>{t("total")}</span>
          {metric(totalKm, totalMinutes)}
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
      >
        {t("openInGoogleMaps")} <ExternalLink size={14} />
      </a>
    </div>
  );
}
