"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  MONTHS_AHEAD,
  type WeekTemplate,
  openSlotsFor,
  todayYmd,
  ymd,
} from "../constants/tours";

/* Google-Calendar-style month grid; only days with open slots are pickable. */
export function MonthCalendar({
  template,
  occupied,
  selected,
  onSelect,
}: {
  template: WeekTemplate;
  occupied: Set<string>;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const t = useTranslations("tours");
  const format = useFormatter();
  // Locale-aware weekday initials, Sun→Sat (2023-01-01 is a Sunday).
  const weekdays = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format.dateTime(new Date(2023, 0, 1 + i), { weekday: "narrow" })
      ),
    [format]
  );
  const start = React.useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);
  const [view, setView] = React.useState(start);
  const last = React.useMemo(
    () => new Date(start.getFullYear(), start.getMonth() + MONTHS_AHEAD, 1),
    [start]
  );

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstWd = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const canPrev = view > start;
  const canNext = view < last;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const availableOn = (dateStr: string) =>
    openSlotsFor(template, dateStr, occupied).length > 0;

  return (
    <div className="bg-card p-4 select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="font-semibold tracking-tight">
          {format.dateTime(new Date(y, m, 1), {
            month: "long",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => canPrev && setView(new Date(y, m - 1, 1))}
            disabled={!canPrev}
            className="w-9 h-9 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none focus-ring"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => canNext && setView(new Date(y, m + 1, 1))}
            disabled={!canNext}
            className="w-9 h-9 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none focus-ring"
            aria-label={t("nextMonth")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w, i) => (
          <span
            key={i}
            className="h-7 inline-flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={"b" + i} />;
          const dateStr = ymd(new Date(y, m, d));
          const isToday = dateStr === todayYmd();
          const isSel = dateStr === selected;
          const open = availableOn(dateStr);
          return (
            <button
              key={d}
              type="button"
              disabled={!open}
              onClick={() => onSelect(dateStr)}
              className={cn(
                "relative h-10 inline-flex items-center justify-center text-sm font-medium tabular-nums transition-colors focus-ring",
                isSel
                  ? "bg-primary text-primary-foreground"
                  : open
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground/40 pointer-events-none"
              )}
            >
              {d}
              {open && !isSel && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary" />
              )}
              {isToday && !isSel && (
                <span className="absolute top-1 right-1 text-[8px] font-bold uppercase text-primary">
                  ·
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
