"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Eye, Lightbulb, Route } from "lucide-react";
import { Button } from "@/components/ui/button";

/* The cheaper-visiting-order hint as its own card: headline savings, the
   reordered stop numbers as small circled badges, and the preview toggle.
   The numbers are the schedule positions on the map pins — they never
   renumber. Suggest-only — previewing never touches bookings. */
export function RouteSuggestionCard({
  savedMinutes,
  order,
  previewing,
  onToggle,
}: {
  savedMinutes: number;
  /** Stop numbers (0-based, schedule order) in the suggested visiting order. */
  order: number[];
  previewing: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("tour.route");
  return (
    <div className="anim-fade bg-accent p-3.5 text-accent-foreground">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
          <Lightbulb size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold">
            {t("suggestionTitle", { minutes: savedMinutes })}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-accent-foreground/80">
            <span>{t("reorderTo")}</span>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {order.map((n, i) => (
                <Fragment key={n}>
                  {i > 0 && <span className="opacity-40">→</span>}
                  <span className="route-dot inline-flex size-[18px] items-center justify-center bg-primary text-[11px] font-bold text-primary-foreground tabular-nums">
                    {n + 1}
                  </span>
                </Fragment>
              ))}
            </span>
            <span className="sr-only">
              {order.map((n) => n + 1).join(" → ")}
            </span>
          </p>
        </div>
      </div>
      <Button
        variant={previewing ? "default" : "secondary"}
        size="sm"
        className="mt-3 w-full"
        onClick={onToggle}
      >
        {previewing ? (
          <>
            <Route size={15} /> {t("previewOff")}
          </>
        ) : (
          <>
            <Eye size={15} /> {t("preview")}
          </>
        )}
      </Button>
    </div>
  );
}
