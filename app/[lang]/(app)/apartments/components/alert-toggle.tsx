"use client";

import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* Alerts state pill — the single at-a-glance signal for on vs off, shared by
   the saved-search card footer and the save dialog. */
export function AlertToggle({
  on,
  onClick,
  className,
}: {
  on: boolean;
  onClick: () => void;
  className?: string;
}) {
  const t = useTranslations("apartments.savedSearches");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={on ? t("alertsOnTitle") : t("alertsOffTitle")}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-sm font-medium transition-colors focus-ring",
        on
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-secondary text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {on ? <Bell size={15} /> : <BellOff size={15} />}
      <span>{on ? t("alertsOn") : t("alertsOff")}</span>
    </button>
  );
}
