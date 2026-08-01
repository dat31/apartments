"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Crosshair, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NudgePad } from "./nudge-pad";
import { cn } from "@/lib/utils";
import { describeYaw, doorLabel } from "@/lib/virtual-tour/hotspots";
import { sceneById } from "@/lib/virtual-tour/scene-graph";
import type { LinkHotspot, Scene } from "@/schemas/virtual-tour";

/* One door in the room's marker list — the keyboard's way to everything a
   pointer can do to it, and the only way to reach a door that is behind you
   or stacked on top of another.

   A door whose room is gone opens itself: it is the one thing that blocks
   publishing, so it shows the fix (point it somewhere else, or remove it)
   without the host having to select it first. */
export function DoorRow({
  hotspot,
  scenes,
  others,
  selected,
  disabled,
  onSelect,
  onNudge,
  onRepoint,
  onMove,
  onRemove,
}: {
  hotspot: LinkHotspot;
  scenes: Scene[];
  others: Scene[];
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onNudge: (dYaw: number, dPitch: number) => void;
  onRepoint: (target: string) => void;
  onMove: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const td = useTranslations("virtualTourEditor.directions");
  const target = sceneById(scenes, hotspot.target);
  const open = selected || !target;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 bg-muted p-3",
        selected && "ring-2 ring-primary",
        !target && "bg-destructive/10"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="focus-ring flex w-full items-start gap-2.5 text-left"
      >
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
            target ? "bg-primary text-primary-foreground" : "bg-destructive text-white"
          )}
          aria-hidden="true"
        >
          {target ? <ArrowRight size={15} /> : <TriangleAlert size={14} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {target ? t("doorTo", { room: doorLabel(scenes, hotspot) }) : t("doorNowhere")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {td(describeYaw(hotspot.yaw))}
          </span>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2.5">
          {!target && (
            <Select disabled={disabled} onValueChange={onRepoint}>
              <SelectTrigger aria-label={t("repoint")}>
                <SelectValue placeholder={t("repoint")} />
              </SelectTrigger>
              <SelectContent>
                {others.map((scene) => (
                  <SelectItem key={scene.id} value={scene.id}>
                    {scene.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {target && <NudgePad onNudge={onNudge} disabled={disabled} />}
          <div className="flex flex-wrap gap-2">
            {target && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                disabled={disabled}
                onClick={onMove}
              >
                <Crosshair size={14} /> {t("moveMarker")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 size={14} /> {t("doorDelete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
