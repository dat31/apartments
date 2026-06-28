"use client";

import { useTranslations, useFormatter } from "next-intl";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

/* Grid of selectable tour times for the chosen day. */
export function TimeSlots({
  slots,
  value,
  onPick,
  empty,
}: {
  slots: string[];
  value: string;
  onPick: (time: string) => void;
  empty?: string;
}) {
  const t = useTranslations("tours");
  const format = useFormatter();
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!slots.length)
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {empty ?? t("noOpenings")}
      </p>
    );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onPick(slot)}
          className={cn(
            "h-11 inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors focus-ring",
            value === slot
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Clock size={15} /> {fmtTime(slot)}
        </button>
      ))}
    </div>
  );
}
