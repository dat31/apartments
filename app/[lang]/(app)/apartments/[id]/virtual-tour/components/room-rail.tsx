"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Scene } from "@/schemas/virtual-tour";

/* The room rail: every scene in the tour as a thumbnail, so a renter is
   never dependent on finding the right door. It is also the way back out of
   a one-way link, which is why validateTourGraph tolerates those.

   Overlaid on the stage — bottom strip on every breakpoint, scrollable when
   a tour has more rooms than fit. */
export function RoomRail({
  scenes,
  activeId,
  onSelect,
}: {
  scenes: Scene[];
  activeId: string;
  onSelect: (sceneId: string) => void;
}) {
  const t = useTranslations("virtualTour");
  const railRef = React.useRef<HTMLDivElement>(null);

  /* Keep the room you are standing in visible in the strip. */
  React.useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>(`[data-scene="${activeId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeId]);

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label={t("rooms")}
      className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-foreground/45 to-transparent p-3 sm:p-4"
    >
      {scenes.map((scene) => {
        const active = scene.id === activeId;
        return (
          <button
            key={scene.id}
            type="button"
            role="tab"
            data-scene={scene.id}
            aria-selected={active}
            onClick={() => onSelect(scene.id)}
            className={cn(
              "focus-ring group relative h-14 w-24 shrink-0 overflow-hidden bg-secondary sm:h-16 sm:w-28",
              active ? "ring-2 ring-primary" : "opacity-85 hover:opacity-100"
            )}
          >
            <Image
              src={scene.preview}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-foreground/70 px-1.5 py-1 text-[11px] font-medium text-background">
              {scene.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
