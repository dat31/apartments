"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useDrag, useDrop } from "react-dnd";
import { Compass, GripVertical, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROOM_KINDS, type Scene } from "@/schemas/virtual-tour";

export const ROOM_DND = "virtual-tour-room";

type DragItem = { index: number };

/* One room in the editor: its photo, its name, what kind of room it is, and
   whether the tour opens here. Dragging reorders — the order is the order a
   renter meets the rooms in the rail, which is the only thing sort_order
   means. Same react-dnd sortable shape as photo-card.tsx. */
export function RoomCard({
  scene,
  index,
  isEntry,
  move,
  onCommitOrder,
  onRename,
  onKindChange,
  onMakeEntry,
  onFrame,
  onRemove,
  disabled,
}: {
  scene: Scene;
  index: number;
  isEntry: boolean;
  move: (from: number, to: number) => void;
  onCommitOrder: () => void;
  onRename: (name: string) => void;
  onKindChange: (room: Scene["room"]) => void;
  onMakeEntry: () => void;
  onFrame: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("virtualTourEditor");
  const tk = useTranslations("virtualTourEditor.roomKinds");

  const [{ isDragging }, drag] = useDrag({
    type: ROOM_DND,
    item: { index } as DragItem,
    collect: (m) => ({ isDragging: m.isDragging() }),
    end: onCommitOrder,
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ROOM_DND,
    collect: (m) => ({ isOver: m.isOver() }),
    hover: (item) => {
      if (item.index !== index) {
        move(item.index, index);
        item.index = index;
      }
    },
  });

  const attachRef = (node: HTMLDivElement | null) => {
    drop(node);
  };

  return (
    <div
      ref={attachRef}
      className={cn(
        "flex flex-col gap-4 bg-card p-4 transition-opacity sm:flex-row sm:items-start",
        isDragging && "opacity-30",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          ref={(node) => {
            drag(node);
          }}
          className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-hidden="true"
        >
          <GripVertical size={18} />
        </span>
        <div className="relative h-20 w-40 shrink-0 overflow-hidden bg-muted">
          <Image
            src={scene.preview}
            alt=""
            fill
            sizes="160px"
            draggable={false}
            className="pointer-events-none object-cover"
            unoptimized
          />
          {isEntry && (
            <span className="absolute left-1.5 top-1.5">
              <Badge className="gap-1 text-[10px]">
                <Star size={11} /> {t("entryBadge")}
              </Badge>
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Uncontrolled, so typing costs no re-render and no write; the
              rename lands on blur. `key` re-seeds it if the stored name
              changes underneath (a failed save, another tab). An empty or
              unchanged value falls back to what is stored. */}
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
          <Select
            value={scene.room}
            disabled={disabled}
            onValueChange={(v) => onKindChange(v as Scene["room"])}
          >
            <SelectTrigger className="sm:w-44" aria-label={t("roomKind")}>
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={onFrame}
          >
            <Compass size={15} /> {t("setOpeningView")}
          </Button>
          {!isEntry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={disabled}
              onClick={onMakeEntry}
            >
              <Star size={15} /> {t("makeEntry")}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 size={15} /> {t("removeRoom")}
          </Button>
        </div>
      </div>
    </div>
  );
}
