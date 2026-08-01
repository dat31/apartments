"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Scene } from "@/schemas/virtual-tour";

/* The room rail: every scene in the tour as a chip, so a renter is never
   dependent on finding the right door. It is also the way back out of a
   one-way link, which is why validateTourGraph tolerates those.

   Chips rather than the big thumbnails a photo gallery would use: this rail
   sits over the room a renter is looking at, and a strip of competing
   photographs reads as "here are more pictures" instead of "here is the rest
   of the flat". The thumbnail is small enough to identify a room you have
   already stood in, the name does the rest. */
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
      className="tour-rail flex items-center gap-2 overflow-x-auto"
    >
      {scenes.map((scene, index) => {
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
              "tour-glass tour-glass-btn focus-ring flex h-11 shrink-0 items-center gap-2.5 py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-medium",
              active && "tour-chip-active"
            )}
          >
            <Image
              src={scene.preview}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 object-cover"
            />
            <span className="whitespace-nowrap">{scene.name}</span>
            <span className={cn("text-[11px] tabular-nums", active ? "opacity-55" : "text-white/60")}>
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
