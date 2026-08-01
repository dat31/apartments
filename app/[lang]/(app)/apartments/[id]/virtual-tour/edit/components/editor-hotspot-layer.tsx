"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { doorLabel, normalizeDirection, type Direction } from "@/lib/virtual-tour/hotspots";
import { projectToScreen, screenToYawPitch, type Camera } from "@/lib/virtual-tour/math";
import { sceneById } from "@/lib/virtual-tour/scene-graph";
import type { Hotspot, Scene } from "@/schemas/virtual-tour";
import type { FrameHandler } from "../../components/hotspot-layer";

/* The owner's marker overlay.

   Deliberately *not* the renter's hotspot-layer with an edit flag. That one
   is on the critical path of every tour a renter opens; growing an authoring
   mode into it would ship this code to all of them and couple two surfaces
   that only look alike. What they share is `projectToScreen` and the engine —
   the parts that have to agree, and do.

   What is different here: a marker can be picked up. A drag converts the
   pointer position back through `screenToYawPitch` on every move, so the
   marker sits exactly under the finger. If one ever appears to lag or drift,
   the camera snapshot has gone stale — the two conversions are inverses and
   math.test.ts pins that; the maths is not where the bug is. */

const DRAG_SLOP = 4;

export function EditorHotspotLayer({
  scene,
  scenes,
  frameRef,
  hostRef,
  selectedId,
  aiming,
  onSelect,
  onMove,
}: {
  scene: Scene;
  scenes: Scene[];
  frameRef: React.RefObject<FrameHandler | null>;
  hostRef: React.RefObject<HTMLElement | null>;
  selectedId: string | null;
  aiming: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: Direction) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const nodes = React.useRef(new Map<string, HTMLButtonElement>());
  /** The last frame's camera, kept out of React: a drag needs it at pointer
      rate, and re-rendering at 60 Hz to carry it would be absurd. */
  const live = React.useRef<{ camera: Camera; size: { width: number; height: number } } | null>(
    null
  );
  const drag = React.useRef<{
    id: string;
    from: { x: number; y: number };
    dir: Direction;
    moved: boolean;
  } | null>(null);
  const dragged = React.useRef(false);

  const hotspots = scene.hotspots;

  React.useEffect(() => {
    const markers = nodes.current;
    frameRef.current = (camera, size) => {
      live.current = { camera, size };
      for (const hotspot of hotspots) {
        const el = markers.get(hotspot.id);
        if (!el) continue;
        // A marker being dragged follows the pointer, not what is stored:
        // the write only happens on release.
        const held = drag.current?.id === hotspot.id ? drag.current.dir : hotspot;
        const { x, y, visible } = projectToScreen(held, camera, size);
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
    };
    return () => {
      frameRef.current = null;
    };
  }, [frameRef, hotspots]);

  const onPointerDown = (hotspot: Hotspot) => (e: React.PointerEvent<HTMLButtonElement>) => {
    // The canvas never sees this: the overlay is above it, so the camera
    // cannot turn while a marker is being carried. The stage above must not
    // read it as a press on the photograph either.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: hotspot.id,
      from: { x: e.clientX, y: e.clientY },
      dir: { yaw: hotspot.yaw, pitch: hotspot.pitch },
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const held = drag.current;
    const frame = live.current;
    const host = hostRef.current;
    if (!held || !frame || !host) return;
    if (
      !held.moved &&
      Math.hypot(e.clientX - held.from.x, e.clientY - held.from.y) < DRAG_SLOP
    ) {
      return;
    }
    held.moved = true;
    const rect = host.getBoundingClientRect();
    held.dir = normalizeDirection(
      screenToYawPitch(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        frame.camera,
        frame.size
      )
    );
  };

  const onPointerUp = () => {
    const held = drag.current;
    drag.current = null;
    if (!held?.moved) return;
    dragged.current = true;
    onMove(held.id, held.dir);
  };

  return (
    <div key={scene.id} className="pointer-events-none absolute inset-0">
      {hotspots.map((hotspot) => {
        const isDoor = hotspot.kind === "link";
        const target = isDoor ? sceneById(scenes, hotspot.target) : undefined;
        const broken = isDoor && !target;
        const label = isDoor ? doorLabel(scenes, hotspot) : hotspot.label;

        return (
          <button
            key={hotspot.id}
            type="button"
            data-hotspot={hotspot.id}
            data-hotspot-kind={hotspot.kind}
            aria-pressed={selectedId === hotspot.id}
            ref={(el) => {
              if (el) nodes.current.set(hotspot.id, el);
              else nodes.current.delete(hotspot.id);
            }}
            onPointerDown={onPointerDown(hotspot)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onClick={() => {
              // Suppress the click a finished drag leaves behind, so putting
              // a marker down doesn't also re-open its editor.
              if (dragged.current) {
                dragged.current = false;
                return;
              }
              onSelect(hotspot.id);
            }}
            aria-label={
              broken
                ? t("doorNowhere")
                : isDoor
                  ? t("doorTo", { room: label })
                  : t("noteMarker", { title: label || t("noteUntitled") })
            }
            style={{ visibility: "hidden" }}
            className={cn(
              "focus-ring tour-marker-edit pointer-events-auto absolute left-0 top-0 flex cursor-move touch-none text-white",
              isDoor ? "tour-door flex-col items-center gap-1.5" : "tour-poi items-center gap-2",
              selectedId === hotspot.id && "is-selected",
              broken && "is-broken",
              /* While the crosshair is up, existing markers step back and
                 stop taking the pointer: the host is aiming at the
                 photograph, and a tap that lands on a marker still means the
                 spot behind it. */
              aiming && "pointer-events-none opacity-40"
            )}
          >
            {isDoor ? (
              <>
                <span className="tour-door-ring" aria-hidden="true">
                  {broken ? <TriangleAlert size={20} /> : <ArrowRight size={22} />}
                </span>
                <span className="tour-marker-label whitespace-nowrap text-[13px] font-semibold">
                  {broken ? t("doorNowhereShort") : label}
                </span>
              </>
            ) : (
              <>
                <span className="tour-poi-dot" aria-hidden="true">
                  <Plus size={16} />
                </span>
                <span className="tour-marker-label max-w-52 text-left text-[12.5px] font-medium text-pretty">
                  {label || t("noteUntitled")}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
