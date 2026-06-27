"use client";

import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { tourTimeLabel } from "../constants/tours";

/* Grid of selectable tour times for the chosen day. */
export function TimeSlots({
  slots,
  value,
  onPick,
  empty = "No openings this day.",
}: {
  slots: string[];
  value: string;
  onPick: (time: string) => void;
  empty?: string;
}) {
  if (!slots.length)
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{empty}</p>
    );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className={cn(
            "h-11 inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors focus-ring",
            value === t
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Clock size={15} /> {tourTimeLabel(t)}
        </button>
      ))}
    </div>
  );
}
