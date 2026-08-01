"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Crosshair, Grip, Loader2, Minus, Plus } from "lucide-react";
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
   state: 60 renders a second would be 60 reconciliations a second.

   It fills its container edge to edge and paints its own chrome — the
   vignette that keeps the tour's glass controls legible over a bright
   window, the arriving state, the look-around prompt, and the zoom column
   for anyone without a wheel or a second finger. */
export function PanoramaViewer({
  scene,
  scenes,
  activePoiId,
  onNavigate,
  onOpenPoi,
}: {
  scene: Scene;
  scenes: Scene[];
  activePoiId: string | null;
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
      <div className="absolute inset-0">
        <Image
          src={scene.preview}
          alt={scene.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <p className="tour-glass absolute inset-x-4 top-28 mx-auto max-w-100 p-4 text-center text-sm">
          {t("noWebgl")}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
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
        activePoiId={activePoiId}
        onNavigate={(id) => {
          const target = sceneById(scenes, id);
          // Using a marker is knowing how the tour works: the prompt below
          // has done its job, whether or not the camera was ever dragged.
          setHint(false);
          if (target) onNavigate(id);
        }}
        onOpenPoi={(hotspot) => {
          setHint(false);
          onOpenPoi(hotspot);
        }}
      />

      <span className="pano-vignette" aria-hidden="true" />

      {status === "loading" && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
        >
          <span className="tour-glass pano-chip">
            <Loader2 size={14} className="animate-spin" /> {t("loadingScene")}
          </span>
        </div>
      )}

      {/* The look-around prompt, retired by the first drag, key or pinch —
          a renter who already knows should never be told twice. */}
      {hint && status === "ready" && (
        <div className="tour-glass pano-hint" aria-hidden="true">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
            <Grip size={17} /> {t("dragHint")}
          </span>
          <span className="text-[12.5px] text-white/80 text-pretty">
            {t("dragHintBody")}
          </span>
        </div>
      )}

      {/* Zoom and recentre without a wheel or a second finger — and a
          focusable target for keyboard users who want a closer look.

          Hugging an edge, and folding into the bottom corner from lg up
          where the essentials column already owns the right one. Anything
          parked over the middle of the room would sit on top of a door: the
          markers are laid out by where the opening really is, so the chrome
          is what has to stay out of the way. */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5 sm:right-4 lg:bottom-24 lg:top-auto lg:translate-y-0 lg:flex-row">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(-10)}
          aria-label={t("zoomIn")}
          className="tour-glass tour-glass-btn focus-ring pano-ctl"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(10)}
          aria-label={t("zoomOut")}
          className="tour-glass tour-glass-btn focus-ring pano-ctl"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.resetView(scene.yaw, scene.pitch)}
          aria-label={t("recenter")}
          className="tour-glass tour-glass-btn focus-ring pano-ctl"
        >
          <Crosshair size={17} />
        </button>
      </div>
    </div>
  );
}
