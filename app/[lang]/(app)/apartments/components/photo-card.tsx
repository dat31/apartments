"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useDrag, useDrop } from "react-dnd";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GripVertical, X } from "lucide-react";

export const PHOTO_DND = "listing-photo";

type DragItem = { index: number };

/* A single draggable / droppable photo tile. Hovering another tile while
   dragging swaps their order (the classic react-dnd sortable pattern). */
export function PhotoCard({
  src,
  index,
  move,
  onRemove,
}: {
  src: string;
  index: number;
  move: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  const t = useTranslations("listingForm.photoUploader");
  const [{ isDragging }, drag] = useDrag({
    type: PHOTO_DND,
    item: { index } as DragItem,
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: PHOTO_DND,
    collect: (m) => ({ isOver: m.isOver() }),
    hover: (item) => {
      if (item.index !== index) {
        move(item.index, index);
        item.index = index;
      }
    },
  });

  // Combine the drag + drop connectors via a callback ref so we never read
  // ref.current during render (keeps the React 19 compiler happy).
  const attachRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <div
      ref={attachRef}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden bg-muted cursor-grab active:cursor-grabbing transition-opacity",
        isDragging && "opacity-30",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-card"
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        draggable={false}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover pointer-events-none"
        unoptimized
      />

      {index === 0 && (
        <span className="absolute top-2 left-2">
          <Badge>{t("cover")}</Badge>
        </span>
      )}

      <span
        className="absolute bottom-2 left-2 inline-flex items-center justify-center w-7 h-7 bg-background/90 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        <GripVertical size={15} />
      </span>

      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={t("removePhoto")}
        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 focus-ring"
      >
        <X size={15} />
      </button>
    </div>
  );
}
