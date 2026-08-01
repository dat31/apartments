"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Star, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomFlag } from "./room-flag";
import { SectionTitle } from "./section-title";
import { cn } from "@/lib/utils";
import { inboundDoors } from "@/lib/virtual-tour/hotspots";
import { sceneById } from "@/lib/virtual-tour/scene-graph";
import type { Scene } from "@/schemas/virtual-tour";

/* The rooms, in the order a renter meets them.

   Reordering is two buttons rather than a drag: the order matters (it is what
   `sort_order` means and the only thing it means), a host is often on a
   phone, and a drag is the one gesture this page cannot spare — it belongs to
   looking around inside a room. */
export function RoomList({
  scenes,
  selectedId,
  entryId,
  disabled,
  onSelect,
  onMove,
  onRemove,
}: {
  scenes: Scene[];
  selectedId: string;
  entryId: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (scene: Scene) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const tk = useTranslations("virtualTourEditor.roomKinds");
  const inbound = inboundDoors(scenes);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
          <h2 className="text-[15px] font-semibold tracking-tight">{t("rooms")}</h2>
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {scenes.length}
          </span>
        </div>

        <ul className="flex flex-col px-2 pb-3">
          {scenes.map((scene, index) => {
            const broken = scene.hotspots.filter(
              (h) => h.kind === "link" && !sceneById(scenes, h.target)
            ).length;
            const notes = scene.hotspots.filter((h) => h.kind === "info").length;
            const orphan = scene.id !== entryId && inbound.get(scene.id)?.length === 0;

            return (
              <li
                key={scene.id}
                className={cn(
                  "flex items-center gap-1",
                  scene.id === selectedId && "bg-accent text-accent-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(scene.id)}
                  aria-current={scene.id === selectedId}
                  className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 p-2 text-left"
                >
                  <span className="relative h-11 w-20 shrink-0 overflow-hidden bg-muted">
                    <Image
                      src={scene.preview}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium">{scene.name}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <RoomFlag>{tk(scene.room)}</RoomFlag>
                      {scene.id === entryId && (
                        <RoomFlag tone="primary">
                          <Star size={11} /> {t("entryBadge")}
                        </RoomFlag>
                      )}
                      {broken > 0 && (
                        <RoomFlag tone="destructive">
                          <TriangleAlert size={11} /> {t("leadsNowhereCount", { count: broken })}
                        </RoomFlag>
                      )}
                      {orphan && <RoomFlag>{t("noWayInShort")}</RoomFlag>}
                      {notes > 0 && <RoomFlag>{t("notesShort", { count: notes })}</RoomFlag>}
                    </span>
                  </span>
                </button>

                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => onMove(scene.id, -1)}
                    aria-label={t("moveUp")}
                    className="focus-ring grid h-6 w-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === scenes.length - 1}
                    onClick={() => onMove(scene.id, 1)}
                    aria-label={t("moveDown")}
                    className="focus-ring grid h-6 w-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => onRemove(scene)}
                  aria-label={t("removeRoomNamed", { room: scene.name })}
                  className="mr-1 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={15} />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Which rooms connect to which, without opening every room to find
          out. A door that leads nowhere is called out here too — it is the
          one thing that stops the tour going live. */}
      <div className="bg-card p-4">
        <SectionTitle>{t("connections")}</SectionTitle>
        {scenes.every((s) => !s.hotspots.some((h) => h.kind === "link")) ? (
          <p className="mt-2 text-[12.5px] text-muted-foreground text-pretty">
            {t("noConnections")}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {scenes
              .filter((s) => s.hotspots.some((h) => h.kind === "link"))
              .map((scene) => (
                <li key={scene.id} className="text-[12.5px] leading-snug">
                  <span className="font-medium">{scene.name}</span>
                  <span className="text-muted-foreground"> → </span>
                  {scene.hotspots
                    .filter((h) => h.kind === "link")
                    .map((hotspot, i) => {
                      const target =
                        hotspot.kind === "link" ? sceneById(scenes, hotspot.target) : undefined;
                      return (
                        <span key={hotspot.id}>
                          {i > 0 && <span className="text-muted-foreground">, </span>}
                          <span className={cn(!target && "font-medium text-destructive")}>
                            {target ? target.name : t("leadsNowhere")}
                          </span>
                        </span>
                      );
                    })}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
