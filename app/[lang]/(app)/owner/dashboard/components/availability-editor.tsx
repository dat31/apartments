"use client";

import { useTranslations, useFormatter } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMyAvailability } from "@/hooks/use-availability";
import {
  TOUR_TIMES,
  type WeekTemplate,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { Clock } from "lucide-react";

/* Weekly recurring tour-availability editor. Each weekday is a row of
   toggleable time chips; the result repeats every week. */
export function AvailabilityEditor() {
  const t = useTranslations("dashboard.availability");
  const format = useFormatter();
  // Locale-aware short weekday labels, Sun→Sat (2023-01-01 is a Sunday).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(2023, 0, 1 + i), { weekday: "short" })
  );
  const fmtHour = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), { hour: "numeric" });
  };
  const { template, total, toggle, replaceWeek } = useMyAvailability();

  const preset = (kind: "weekday" | "all" | "clear") => {
    if (kind === "clear") return replaceWeek({});
    if (kind === "weekday") {
      const wd = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
      return replaceWeek({ 1: [...wd], 2: [...wd], 3: [...wd], 4: [...wd], 5: [...wd] });
    }
    const all: WeekTemplate = {};
    for (let i = 0; i < 7; i++) all[i] = [...TOUR_TIMES];
    replaceWeek(all);
  };

  return (
    <div className="bg-card p-6 anim-fade">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 h-9 text-sm font-medium tabular-nums">
          <Clock size={15} /> {t("slotsPerWeek", { count: total })}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <Button variant="secondary" size="sm" onClick={() => preset("weekday")}>
          {t("presetWeekday")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => preset("all")}>
          {t("presetAll")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => preset("clear")}>
          {t("presetClear")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {weekdays.map((label, wd) => {
          const on = template[wd] ?? [];
          return (
            <div
              key={wd}
              className="flex flex-col sm:flex-row sm:items-center gap-2 py-1"
            >
              <div className="sm:w-16 shrink-0 flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {on.length > 0 && (
                  <span className="sm:hidden text-xs text-muted-foreground tabular-nums">
                    ({on.length})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TOUR_TIMES.map((time) => {
                  const active = on.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggle(wd, time)}
                      className={cn(
                        "h-9 px-2.5 text-[13px] font-medium tabular-nums transition-colors focus-ring",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {fmtHour(time)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
