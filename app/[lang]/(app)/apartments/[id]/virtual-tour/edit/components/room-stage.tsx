"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, Crosshair, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorHotspotLayer } from "./editor-hotspot-layer";
import { createEngine, type Engine } from "../../lib/engine";
import type { FrameHandler } from "../../components/hotspot-layer";
import { LOOK_STEP, normalizeDirection, type Direction } from "@/lib/virtual-tour/hotspots";
import { clampPitch, screenToYawPitch, wrapYaw, type Camera } from "@/lib/virtual-tour/math";
import type { Scene } from "@/schemas/virtual-tour";

/* Standing in one room: look around, frame the view a renter arrives on, and
   put markers on what you can see.

   **One placement gesture on every device.** Aim the crosshair at the thing
   and confirm. It never competes with the drag used to look around (which is
   why tap-to-place alone is not enough on a phone: the target is under the
   finger doing the dragging), and it works with the keyboard alone — arrows
   look, Enter places. Tapping a spot in the photograph is offered as well,
   for a mouse, but nothing depends on hitting a target inside a photograph.

   One engine, mounted once. A second WebGL context for authoring would double
   the GPU cost of the same room and exhaust the browser's context budget. */

/** How far a press may travel and still count as "I meant that spot". */
const TAP_SLOP = 6;

export type StageAim = {
  /** What the host is being asked to point at. */
  prompt: string;
  /** The confirm button on the crosshair bar. */
  confirm: string;
};

export function RoomStage({
  scene,
  scenes,
  aim,
  selectedId,
  look,
  onPlace,
  onCancelAim,
  onSelect,
  onMove,
  onSaveView,
}: {
  scene: Scene;
  scenes: Scene[];
  aim: StageAim | null;
  selectedId: string | null;
  /** Turn the camera to face something — how the marker list reaches a
      marker that is behind the host, or one of two sitting on top of each
      other. A new object means "turn now", so the parent makes one per
      selection rather than per render. */
  look: Direction | null;
  onPlace: (dir: Direction) => void;
  onCancelAim: () => void;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: Direction) => void;
  onSaveView: (view: { yaw: number; pitch: number; hfov: number }) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const hostRef = React.useRef<HTMLDivElement>(null);
  const engineRef = React.useRef<Engine | null>(null);
  const frameRef = React.useRef<FrameHandler | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);
  const sizeRef = React.useRef({ width: 1, height: 1 });
  const press = React.useRef<{ x: number; y: number } | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "no-webgl">("loading");

  /* The scene object changes identity on every marker write. The engine only
     cares when the room itself changes, so the effect below reads the latest
     one through this rather than taking it as a dependency — re-showing a
     room would throw the camera back to its opening view mid-edit. */
  const sceneRef = React.useRef(scene);
  React.useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let engine: Engine;
    try {
      engine = createEngine(host, {
        reducedMotion:
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
        onFrame: (camera, size) => {
          cameraRef.current = camera;
          sizeRef.current = size;
          frameRef.current?.(camera, size);
        },
      });
    } catch {
      // Whether a WebGL context can be had is only knowable by asking, and
      // only in the browser.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("no-webgl");
      return;
    }
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  /* Show the room. Keyed on the room, not on the scene object — see sceneRef. */
  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let cancelled = false;
    setStatus((s) => (s === "no-webgl" ? s : "loading"));
    engine
      .show(sceneRef.current, { animate: false })
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("ready"));
    return () => {
      cancelled = true;
    };
  }, [scene.id, scene.panorama]);

  React.useEffect(() => {
    if (look) engineRef.current?.lookAt(look.yaw, look.pitch);
  }, [look]);

  /** The direction the crosshair is on: the centre of the view *is* the
      camera's direction, so this needs no screen-point conversion at all. */
  const centre = (): Direction | null => {
    const camera = cameraRef.current;
    return camera ? { yaw: camera.yaw, pitch: camera.pitch } : null;
  };

  const placeAtCentre = () => {
    const dir = centre();
    if (dir) onPlace(normalizeDirection(dir));
  };

  const saveView = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    onSaveView({ yaw: camera.yaw, pitch: camera.pitch, hfov: camera.fov });
  };

  /* Looking around without a pointer, and placing without one. The stage is a
     focusable group rather than a canvas with a tabindex so a screen reader
     announces which room it is standing in. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    const camera = cameraRef.current;
    if (!engine || !camera) return;
    const step = e.shiftKey ? LOOK_STEP * 3 : LOOK_STEP;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault();
        const turn = e.key === "ArrowRight" ? step : -step;
        engine.lookAt(wrapYaw(camera.yaw + turn), camera.pitch);
        break;
      }
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const tilt = e.key === "ArrowUp" ? step : -step;
        engine.lookAt(camera.yaw, clampPitch(camera.pitch + tilt));
        break;
      }
      case "Enter":
      case " ":
        if (!aim) return;
        e.preventDefault();
        placeAtCentre();
        break;
      case "+":
      case "=":
        e.preventDefault();
        engine.zoomBy(-8);
        break;
      case "-":
      case "_":
        e.preventDefault();
        engine.zoomBy(8);
        break;
      case "Escape":
        if (aim) onCancelAim();
        break;
      default:
    }
  };

  /* Tapping a spot in the photograph, for a pointer that can hit one. A press
     that travelled was a look, not a placement. */
  const onPointerUp = (e: React.PointerEvent) => {
    const from = press.current;
    press.current = null;
    const host = hostRef.current;
    const camera = cameraRef.current;
    if (!aim || !from || !host || !camera) return;
    if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > TAP_SLOP) return;
    const rect = host.getBoundingClientRect();
    onPlace(
      normalizeDirection(
        screenToYawPitch(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          camera,
          sizeRef.current
        )
      )
    );
  };

  if (status === "no-webgl") {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary xl:aspect-[3/2]">
        <Image
          src={scene.preview}
          alt={scene.name}
          fill
          sizes="(min-width: 1280px) 60vw, 100vw"
          className="object-cover"
          unoptimized
        />
        <p className="tour-glass absolute inset-x-4 top-4 mx-auto max-w-100 p-4 text-center text-sm">
          {t("framingUnavailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="dark tour-shell relative aspect-[4/3] w-full overflow-hidden xl:aspect-[3/2]">
      <div
        role="group"
        tabIndex={0}
        aria-label={t("stageLabel", { room: scene.name })}
        className="focus-ring absolute inset-0"
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          press.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={onPointerUp}
      >
        <div
          ref={hostRef}
          data-testid="editor-canvas"
          className="h-full w-full cursor-grab data-[grabbing]:cursor-grabbing"
        />

        <EditorHotspotLayer
          scene={scene}
          scenes={scenes}
          frameRef={frameRef}
          hostRef={hostRef}
          selectedId={selectedId}
          aiming={aim !== null}
          onSelect={onSelect}
          onMove={onMove}
        />
      </div>

      <span className="pano-vignette" aria-hidden="true" />

      {/* The crosshair sits dead centre because that is where the camera is
          pointing — what you aim at is what gets placed. */}
      {aim && (
        <span className="tour-aim" aria-hidden="true">
          <span className="tour-aim-mark" />
        </span>
      )}

      {status === "loading" && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
        >
          <span className="tour-glass pano-chip">
            <Loader2 size={14} className="animate-spin" /> {t("stageLoading")}
          </span>
        </div>
      )}

      {aim ? (
        <>
          <div className="tour-glass absolute inset-x-3 top-3 z-10 p-3 text-center sm:inset-x-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
            <p className="text-sm font-semibold text-balance">{aim.prompt}</p>
            <p className="mt-0.5 text-[12px] text-white/80 text-balance">
              {t("aimHow")} · {t("aimKeys")}
            </p>
          </div>
          <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={placeAtCentre} className="gap-1.5">
              <Check size={16} /> {aim.confirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancelAim}
              className="tour-glass tour-glass-btn gap-1.5 border-0"
            >
              <X size={16} /> {t("cancel")}
            </Button>
          </div>
        </>
      ) : (
        <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={saveView}
            disabled={status !== "ready"}
            className="tour-glass tour-glass-btn gap-1.5 border-0"
          >
            <Crosshair size={15} /> {t("arrivalUse")}
          </Button>
          <div className="ml-auto flex gap-1.5">
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
              onClick={() =>
                engineRef.current?.resetView(scene.yaw, scene.pitch, scene.hfov)
              }
              aria-label={t("recenter")}
              className="tour-glass tour-glass-btn focus-ring pano-ctl"
            >
              <Crosshair size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
