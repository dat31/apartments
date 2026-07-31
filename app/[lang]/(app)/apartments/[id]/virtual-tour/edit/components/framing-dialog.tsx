"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEngine, type Engine } from "../../lib/engine";
import type { Camera } from "@/lib/virtual-tour/math";
import type { Scene } from "@/schemas/virtual-tour";

/* "Set the opening view": look around the room until it is framed the way you
   want a renter to arrive, then save.

   It stores the zoom as well as the direction, which is what makes `hfov`
   meaningful — the engine reads it back on show() and recentre. Driving the
   real engine rather than a preview image is the point: the owner is choosing
   what the renter will literally see. */
export function FramingDialog({
  scene,
  open,
  onOpenChange,
  onSave,
}: {
  scene: Scene | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (view: { yaw: number; pitch: number; hfov: number }) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const hostRef = React.useRef<HTMLDivElement>(null);
  const engineRef = React.useRef<Engine | null>(null);
  const cameraRef = React.useRef<Camera | null>(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  /* One engine per opening: the dialog unmounts its host between uses, and a
     WebGL context per room would exhaust the browser's budget. */
  React.useEffect(() => {
    const host = hostRef.current;
    if (!open || !scene || !host) return;

    let engine: Engine;
    try {
      engine = createEngine(host, {
        reducedMotion:
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
        // The live camera object, snapshotted on save.
        onFrame: (camera) => {
          cameraRef.current = camera;
        },
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    engineRef.current = engine;
    void engine
      .show(scene, { animate: false })
      .then(() => setReady(true))
      .catch(() => setFailed(true));

    return () => {
      engine.dispose();
      engineRef.current = null;
      setReady(false);
      setFailed(false);
    };
  }, [open, scene]);

  const save = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    onSave({ yaw: camera.yaw, pitch: camera.pitch, hfov: camera.fov });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("framingTitle", { room: scene?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("framingBody")}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
          <div
            ref={hostRef}
            data-testid="framing-canvas"
            className="h-full w-full cursor-grab data-[grabbing]:cursor-grabbing"
          />
          {!ready && !failed && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {failed && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {t("framingUnavailable")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={!ready}>
            {t("saveView")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
