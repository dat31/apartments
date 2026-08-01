"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { InfoHotspot } from "@/schemas/virtual-tour";

/* What an info hotspot says, as a card over the stage rather than a modal.

   A dialog would be wrong here: reading about the balcony shouldn't take the
   balcony off screen, and trapping focus would cut the visitor off from the
   other markers. So this is a plain region — focused when it opens, closed
   with Escape or its own button, and out of the way of everything else.

   It opens beside the room, never across the middle of it: bottom-left from
   lg up — the opposite corner to the essentials column, so the money and the
   host's note never cover each other — and above the room rail on a phone. */
export function PoiPanel({
  hotspot,
  onClose,
}: {
  hotspot: InfoHotspot | null;
  onClose: () => void;
}) {
  const t = useTranslations("virtualTour");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hotspot) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotspot, onClose]);

  if (!hotspot) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={hotspot.label}
      data-testid="poi-panel"
      className="tour-glass anim-fade absolute inset-x-3 bottom-32 z-30 p-5 sm:inset-x-4 lg:inset-x-auto lg:left-4 lg:bottom-28 lg:w-88"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            {t("hostNote")}
          </p>
          <h2 className="mt-1 text-[17px] font-semibold text-balance">
            {hotspot.label}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("poiClose")}
          className="tour-glass-btn focus-ring inline-flex size-9 shrink-0 items-center justify-center"
        >
          <X size={17} />
        </button>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-white/85 text-pretty">
        {hotspot.body}
      </p>
    </div>
  );
}
