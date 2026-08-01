"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { NUDGE_STEP } from "@/lib/virtual-tour/hotspots";

/* Moving a marker without dragging it.

   Pointing at a spot inside a photograph is the obvious gesture and cannot be
   the only one: a host on a keyboard or a screen reader has to be able to put
   a marker exactly where it belongs too. Four keys, 2.5° a press. */
export function NudgePad({
  onNudge,
  disabled,
}: {
  onNudge: (dYaw: number, dPitch: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("virtualTourEditor");

  const key = (label: string, dYaw: number, dPitch: number, icon: React.ReactNode) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onNudge(dYaw, dPitch)}
      aria-label={label}
      className="focus-ring grid size-9 place-items-center bg-secondary text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {icon}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">{t("nudge")}</span>
      {key(t("nudgeLeft"), -NUDGE_STEP, 0, <ChevronLeft size={15} />)}
      {key(t("nudgeRight"), NUDGE_STEP, 0, <ChevronRight size={15} />)}
      {key(t("nudgeUp"), 0, NUDGE_STEP, <ChevronUp size={15} />)}
      {key(t("nudgeDown"), 0, -NUDGE_STEP, <ChevronDown size={15} />)}
    </div>
  );
}
