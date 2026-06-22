"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAvailability } from "@/hooks/use-availability";
import {
  TOUR_TIMES,
  WD_SHORT,
  type WeekTemplate,
  tourTimeLabel,
} from "@/app/(app)/apartments/[id]/constants/tours";
import { Clock } from "lucide-react";

/* Weekly recurring tour-availability editor. Each weekday is a row of
   toggleable time chips; the result repeats every week. */
export function AvailabilityEditor() {
  const { template, setTemplate } = useAvailability();

  const total = Object.values(template).reduce(
    (sum, times) => sum + (times?.length ?? 0),
    0
  );

  const toggle = (wd: number, t: string) => {
    setTemplate((prev) => {
      const cur = prev[wd] ?? [];
      const next = cur.includes(t)
        ? cur.filter((x) => x !== t)
        : [...cur, t].sort();
      return { ...prev, [wd]: next };
    });
  };

  const preset = (kind: "weekday" | "all" | "clear") => {
    if (kind === "clear") return setTemplate({});
    if (kind === "weekday") {
      const t = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
      return setTemplate({ 1: [...t], 2: [...t], 3: [...t], 4: [...t], 5: [...t] });
    }
    const all: WeekTemplate = {};
    for (let i = 0; i < 7; i++) all[i] = [...TOUR_TIMES];
    setTemplate(all);
  };

  return (
    <div className="bg-card p-6 anim-fade">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Tour availability
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick the times you&apos;re open to show your places. This repeats
            every week.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 h-9 text-sm font-medium tabular-nums">
          <Clock size={15} /> {total} slot{total !== 1 ? "s" : ""}/week
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <Button variant="secondary" size="sm" onClick={() => preset("weekday")}>
          Weekdays 10–4
        </Button>
        <Button variant="secondary" size="sm" onClick={() => preset("all")}>
          Every day, all hours
        </Button>
        <Button variant="ghost" size="sm" onClick={() => preset("clear")}>
          Clear all
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {WD_SHORT.map((label, wd) => {
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
                {TOUR_TIMES.map((t) => {
                  const active = on.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggle(wd, t)}
                      className={cn(
                        "h-9 px-2.5 text-[13px] font-medium tabular-nums transition-colors focus-ring",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {tourTimeLabel(t).replace(":00", "")}
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
