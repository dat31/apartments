"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Minus, MousePointer2, Plus } from "lucide-react";
import { HotspotLayer, type FrameHandler } from "./hotspot-layer";
import { createEngine, type Engine } from "../lib/engine";
import { preloadOrder, sceneById } from "@/lib/virtual-tour/scene-graph";
import type { Camera } from "@/lib/virtual-tour/math";
import type { InfoHotspot, Scene } from "@/schemas/virtual-tour";

/* The viewer: a canvas driven by ../lib/engine, with the hotspot overlay on
   top of it. Everything three.js lives in the engine; this component is the
   React shell — mount, feed it the current room, tear it down.

   The overlay is real DOM (see hotspot-layer), so the engine reports the
   camera every frame through a plain function reference rather than React
   state: 60 renders a second would be 60 reconciliations a second. */
export function PanoramaViewer({
  scene,
  scenes,
  onNavigate,
  onOpenPoi,
}: {
  scene: Scene;
  scenes: Scene[];
  onNavigate: (sceneId: string) => void;
  onOpenPoi: (hotspot: InfoHotspot) => void;
}) {
  const t = useTranslations("virtualTour");
  const hostRef = React.useRef<HTMLDivElement>(null);
  const engineRef = React.useRef<Engine | null>(null);
  const frameRef = React.useRef<FrameHandler | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "no-webgl">("loading");
  const [hint, setHint] = React.useState(true);

  /* Mount the engine once. Scene changes are pushed to it below rather than
     rebuilding it — a new WebGL context per room would exhaust the browser's
     context budget within one tour. */
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let engine: Engine;
    try {
      engine = createEngine(host, {
        reducedMotion,
        onFrame: (camera: Camera, size) => frameRef.current?.(camera, size),
      });
    } catch {
      // No WebGL (old browser, blocked context, software rendering refused):
      // the static fallback below takes over. Whether a context can be
      // created is only knowable by trying, and only in the browser — so
      // this one state write from an effect is the honest way to express it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("no-webgl");
      return;
    }

    engineRef.current = engine;
    engine.onFirstInteraction(() => setHint(false));
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  /* Show the current room, then decode the neighbouring ones while idle so
     walking through a door is instant. */
  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let cancelled = false;

    setStatus((s) => (s === "no-webgl" ? s : "loading"));
    engine
      .show(scene)
      .then(() => {
        if (cancelled) return;
        setStatus("ready");
        const urls = preloadOrder(scenes, scene.id)
          .map((id) => sceneById(scenes, id)?.panorama)
          .filter((url): url is string => Boolean(url));
        const idle = window.requestIdleCallback?.bind(window) ?? setTimeout;
        idle(() => {
          if (!cancelled) void engine.preload(urls);
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Keep the room that is already on screen and say so — a failed
        // panorama must not blank the tour.
        setStatus("ready");
        toast.error(t("sceneFailed", { room: scene.name }));
      });

    return () => {
      cancelled = true;
    };
  }, [scene, scenes, t]);

  if (status === "no-webgl") {
    return (
      <div className="relative h-[60svh] w-full bg-secondary lg:h-full">
        <Image
          src={scene.preview}
          alt={scene.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <p className="absolute inset-x-0 bottom-0 bg-foreground/70 p-4 text-center text-sm text-background">
          {t("noWebgl")}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[60svh] w-full overflow-hidden bg-secondary lg:h-full">
      {/* The canvas is appended here by the engine. `cursor-grab` flips to
          `grabbing` off the data attribute the engine sets while dragging. */}
      <div
        ref={hostRef}
        data-testid="panorama-canvas"
        className="h-full w-full cursor-grab data-[grabbing]:cursor-grabbing"
      />

      <HotspotLayer
        scene={scene}
        frameRef={frameRef}
        onNavigate={(id) => {
          const target = sceneById(scenes, id);
          if (target) onNavigate(id);
        }}
        onOpenPoi={onOpenPoi}
      />

      {status === "loading" && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40"
          aria-live="polite"
        >
          <span className="flex items-center gap-2 bg-background px-3 py-2 text-sm">
            <Loader2 size={16} className="animate-spin" /> {t("loadingScene")}
          </span>
        </div>
      )}

      {hint && status === "ready" && (
        <p className="pointer-events-none absolute inset-x-0 top-4 mx-auto flex w-fit items-center gap-2 bg-foreground/70 px-3 py-2 text-xs text-background">
          <MousePointer2 size={14} /> {t("dragHint")}
        </p>
      )}

      {/* Zoom without a wheel or a second finger — and a focusable target for
          keyboard users who want a closer look at a room. */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-px">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(-10)}
          aria-label={t("zoomIn")}
          className="focus-ring bg-background/90 p-2 hover:bg-background"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(10)}
          aria-label={t("zoomOut")}
          className="focus-ring bg-background/90 p-2 hover:bg-background"
        >
          <Minus size={16} />
        </button>
      </div>
    </div>
  );
}
