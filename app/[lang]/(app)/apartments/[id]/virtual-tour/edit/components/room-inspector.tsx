"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Compass, DoorOpen, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoorRow } from "./door-row";
import { NoteForm } from "./note-form";
import { NoteRow } from "./note-row";
import { SectionTitle } from "./section-title";
import { describeYaw } from "@/lib/virtual-tour/hotspots";
import { ROOM_KINDS, type NoteFormValues, type Scene } from "@/schemas/virtual-tour";

/* Everything about the room the host is standing in: what it's called, the
   view a renter arrives on, and every marker in it.

   The marker lists are not a convenience — they are the pointer-free path to
   adding, reaching, editing and removing every marker, which is what stops
   "point at the spot" from being the only way in. */
export function RoomInspector({
  scene,
  scenes,
  isEntry,
  selectedHotspotId,
  pendingNoteYaw,
  disabled,
  onRename,
  onKindChange,
  onMakeEntry,
  onAddDoor,
  onAddNote,
  onSaveNote,
  onCancelNote,
  onSelectHotspot,
  onNudge,
  onRepoint,
  onMoveMarker,
  onEditNote,
  onRemoveHotspot,
}: {
  scene: Scene;
  scenes: Scene[];
  isEntry: boolean;
  selectedHotspotId: string | null;
  /** A note has been placed but not written yet — it has nowhere to live
      until it says something, so its form opens here. */
  pendingNoteYaw: number | null;
  disabled?: boolean;
  onRename: (name: string) => void;
  onKindChange: (room: Scene["room"]) => void;
  onMakeEntry: () => void;
  onAddDoor: (target: string) => void;
  onAddNote: () => void;
  onSaveNote: (values: NoteFormValues) => void;
  onCancelNote: () => void;
  onSelectHotspot: (id: string) => void;
  onNudge: (id: string, dYaw: number, dPitch: number) => void;
  onRepoint: (id: string, target: string) => void;
  onMoveMarker: (id: string) => void;
  onEditNote: (id: string, values: NoteFormValues) => void;
  onRemoveHotspot: (id: string) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const tk = useTranslations("virtualTourEditor.roomKinds");
  const td = useTranslations("virtualTourEditor.directions");
  /* Which room's door picker is open, rather than a boolean — switching
     rooms then closes it without an effect that resets state. */
  const [pickingIn, setPickingIn] = React.useState<string | null>(null);

  const others = scenes.filter((s) => s.id !== scene.id);
  const doors = scene.hotspots.filter((h) => h.kind === "link");
  const notes = scene.hotspots.filter((h) => h.kind === "info");

  const picking = pickingIn === scene.id;

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-card p-4">
        <SectionTitle>{t("thisRoom")}</SectionTitle>
        <div className="mt-2.5 flex flex-col gap-3">
          {/* Uncontrolled: typing costs no write, and the rename lands on
              blur. `key` re-seeds it if the stored name changes underneath. */}
          <Input
            key={scene.name}
            defaultValue={scene.name}
            maxLength={80}
            disabled={disabled}
            aria-label={t("roomName")}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== scene.name) onRename(next);
              else e.target.value = scene.name;
            }}
          />
          <p className="text-xs text-muted-foreground text-pretty">{t("roomNameHint")}</p>
          <Select
            value={scene.room}
            disabled={disabled}
            onValueChange={(v) => onKindChange(v as Scene["room"])}
          >
            <SelectTrigger aria-label={t("roomKind")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {tk(kind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="bg-card p-4">
        <SectionTitle>{t("arrival")}</SectionTitle>
        <p className="mt-2 text-[13px] text-muted-foreground text-pretty">
          {scene.hfov
            ? t("arrivalSet", { direction: td(describeYaw(scene.yaw)) })
            : t("arrivalNone")}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Compass size={14} className="shrink-0" /> {t("arrivalWhere")}
        </p>
        {!isEntry && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 gap-1.5"
            disabled={disabled}
            onClick={onMakeEntry}
          >
            <Star size={14} /> {t("makeEntry")}
          </Button>
        )}
      </section>

      <section className="bg-card p-4">
        <SectionTitle count={doors.length}>{t("doors")}</SectionTitle>
        <div className="mt-2.5 flex flex-col gap-2">
          {doors.map((hotspot) =>
            hotspot.kind === "link" ? (
              <DoorRow
                key={hotspot.id}
                hotspot={hotspot}
                scenes={scenes}
                others={others}
                selected={selectedHotspotId === hotspot.id}
                disabled={disabled}
                onSelect={() => onSelectHotspot(hotspot.id)}
                onNudge={(dYaw, dPitch) => onNudge(hotspot.id, dYaw, dPitch)}
                onRepoint={(target) => onRepoint(hotspot.id, target)}
                onMove={() => onMoveMarker(hotspot.id)}
                onRemove={() => onRemoveHotspot(hotspot.id)}
              />
            ) : null
          )}
        </div>

        {picking ? (
          <div className="mt-3 bg-muted p-3">
            <p className="text-sm font-medium">{t("doorPick")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
              {t("doorPickHint")}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {others.map((room) => (
                <Button
                  key={room.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPickingIn(null);
                    onAddDoor(room.id);
                  }}
                >
                  {room.name}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPickingIn(null)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full gap-1.5"
            disabled={disabled || others.length === 0}
            onClick={() => setPickingIn(scene.id)}
          >
            <DoorOpen size={15} /> {t("addDoor")}
          </Button>
        )}
        {others.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground text-pretty">
            {t("addDoorNeedsRooms")}
          </p>
        )}
      </section>

      <section className="bg-card p-4">
        <SectionTitle count={notes.length}>{t("notes")}</SectionTitle>
        <div className="mt-2.5 flex flex-col gap-2">
          {notes.map((hotspot) =>
            hotspot.kind === "info" ? (
              <NoteRow
                key={hotspot.id}
                hotspot={hotspot}
                selected={selectedHotspotId === hotspot.id}
                disabled={disabled}
                onSelect={() => onSelectHotspot(hotspot.id)}
                onEdit={(values) => onEditNote(hotspot.id, values)}
                onNudge={(dYaw, dPitch) => onNudge(hotspot.id, dYaw, dPitch)}
                onMove={() => onMoveMarker(hotspot.id)}
                onRemove={() => onRemoveHotspot(hotspot.id)}
              />
            ) : null
          )}
        </div>

        {pendingNoteYaw !== null ? (
          <div className="mt-3 bg-muted p-3">
            <p className="text-sm font-medium">
              {t("notePlaced", { direction: td(describeYaw(pendingNoteYaw)) })}
            </p>
            <div className="mt-2.5">
              <NoteForm
                submitLabel={t("noteSave")}
                busy={disabled}
                onSubmit={onSaveNote}
                onCancel={onCancelNote}
              />
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full gap-1.5"
            disabled={disabled}
            onClick={onAddNote}
          >
            <Plus size={15} /> {t("addNote")}
          </Button>
        )}

        <p className="mt-3 text-xs text-muted-foreground text-pretty">{t("hostWords")}</p>
      </section>
    </div>
  );
}
