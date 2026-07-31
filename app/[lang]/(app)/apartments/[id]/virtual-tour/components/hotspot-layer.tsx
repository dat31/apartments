"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DoorOpen, Info } from "lucide-react";
import { projectToScreen, type Camera } from "@/lib/virtual-tour/math";
import type { InfoHotspot, Scene } from "@/schemas/virtual-tour";

export type FrameHandler = (
  camera: Camera,
  size: { width: number; height: number }
) => void;

/* Hotspots as DOM, not sprites.

   Each marker is a real <button>: Tab reaches it, Enter walks through the
   door, a screen reader announces it, and its label is a next-intl string in
   the app's own type rather than pixels baked into a canvas texture. The
   trade is that this overlay cannot exist inside an immersive WebXR session,
   which is why phase 4 of the plan adds a *second*, sprite-based renderer for
   XR only — fed by this same hotspot data.

   Positioning is imperative on purpose. React decides which markers exist;
   the engine's frame loop calls `frameRef.current` and this writes transforms
   straight to the nodes, so looking around costs no re-render. */
export function HotspotLayer({
  scene,
  frameRef,
  onNavigate,
  onOpenPoi,
}: {
  scene: Scene;
  frameRef: React.RefObject<FrameHandler | null>;
  onNavigate: (sceneId: string) => void;
  onOpenPoi: (hotspot: InfoHotspot) => void;
}) {
  const t = useTranslations("virtualTour");
  const nodes = React.useRef(new Map<string, HTMLButtonElement>());

  React.useEffect(() => {
    const markers = nodes.current;
    frameRef.current = (camera, size) => {
      for (const hotspot of scene.hotspots) {
        const el = markers.get(hotspot.id);
        if (!el) continue;
        const { x, y, visible } = projectToScreen(hotspot, camera, size);
        // `visibility` rather than unmounting: a marker that keeps its box
        // keeps its place in the tab order as the visitor turns around.
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
    };
    return () => {
      frameRef.current = null;
    };
  }, [frameRef, scene]);

  /* Markers are keyed by scene so refs don't survive a room change. */
  return (
    <div
      key={scene.id}
      className="pointer-events-none absolute inset-0"
      aria-label={t("hotspotsLabel", { room: scene.name })}
    >
      {scene.hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          data-hotspot={hotspot.id}
          data-hotspot-kind={hotspot.kind}
          ref={(el) => {
            if (el) nodes.current.set(hotspot.id, el);
            else nodes.current.delete(hotspot.id);
          }}
          onClick={() =>
            hotspot.kind === "link" ? onNavigate(hotspot.target) : onOpenPoi(hotspot)
          }
          /* Markers start off screen rather than at 0,0 — the first frame
             hasn't run yet when they mount, and a pile of buttons in the
             corner would flash. */
          style={{ visibility: "hidden" }}
          className="focus-ring pointer-events-auto absolute left-0 top-0 flex max-w-[45%] items-center gap-2 bg-background/85 py-1.5 pl-1.5 pr-3 text-left text-xs font-medium backdrop-blur-sm transition-colors hover:bg-background"
        >
          <span className="hotspot-dot flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            {hotspot.kind === "link" ? <DoorOpen size={15} /> : <Info size={15} />}
          </span>
          <span className="truncate">
            {hotspot.kind === "link" ? t("goTo", { room: hotspot.label }) : hotspot.label}
          </span>
        </button>
      ))}
    </div>
  );
}
