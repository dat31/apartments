"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InfoHotspot } from "@/schemas/virtual-tour";

/* What an info hotspot says, as a card over the stage rather than a modal.

   A dialog would be wrong here: reading about the balcony shouldn't take the
   balcony off screen, and trapping focus would cut the visitor off from the
   other markers. So this is a plain region — focused when it opens, closed
   with Escape or its own button, and out of the way of everything else. */
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
      className="anim-fade absolute inset-x-4 bottom-24 z-10 max-w-sm bg-background p-4 sm:inset-x-auto sm:left-6 sm:bottom-28"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{hotspot.label}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2 size-8 shrink-0"
          onClick={onClose}
          aria-label={t("poiClose")}
        >
          <X size={16} />
        </Button>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
        {hotspot.body}
      </p>
    </div>
  );
}
