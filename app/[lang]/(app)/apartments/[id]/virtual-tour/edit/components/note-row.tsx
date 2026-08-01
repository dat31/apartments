"use client";

import { useTranslations } from "next-intl";
import { Crosshair, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteForm } from "./note-form";
import { NudgePad } from "./nudge-pad";
import { cn } from "@/lib/utils";
import { describeYaw } from "@/lib/virtual-tour/hotspots";
import type { NoteFormValues } from "@/schemas/virtual-tour";
import type { InfoHotspot } from "@/schemas/virtual-tour";

/* One point of interest in the room's marker list. Selecting it opens the
   same form it was written with — editing what a note says and moving where
   it points are the same activity from the host's side. */
export function NoteRow({
  hotspot,
  selected,
  disabled,
  onSelect,
  onEdit,
  onNudge,
  onMove,
  onRemove,
}: {
  hotspot: InfoHotspot;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onEdit: (values: NoteFormValues) => void;
  onNudge: (dYaw: number, dPitch: number) => void;
  onMove: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const td = useTranslations("virtualTourEditor.directions");

  return (
    <div className={cn("flex flex-col gap-2.5 bg-muted p-3", selected && "ring-2 ring-primary")}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="focus-ring flex w-full items-start gap-2.5 text-left"
      >
        <span
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
          aria-hidden="true"
        >
          <Plus size={15} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{hotspot.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {td(describeYaw(hotspot.yaw))} · {hotspot.body}
          </span>
        </span>
      </button>

      {selected && (
        <div className="flex flex-col gap-3">
          <NoteForm
            key={`${hotspot.id}-${hotspot.label}-${hotspot.body}`}
            initial={{ label: hotspot.label, body: hotspot.body }}
            submitLabel={t("noteSave")}
            busy={disabled}
            onSubmit={onEdit}
          />
          <NudgePad onNudge={onNudge} disabled={disabled} />
          <div className="flex flex-wrap gap-2">
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 size={14} /> {t("noteDelete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
