"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PanoramaViewerLazy } from "./panorama-viewer-lazy";
import { PoiPanel } from "./poi-panel";
import { RoomRail } from "./room-rail";
import { sceneById, stepScene } from "@/lib/virtual-tour/scene-graph";
import type { InfoHotspot, VirtualTour } from "@/schemas/virtual-tour";

/* The tour's client orchestrator: which room is on screen, which point of
   interest is open, and the layout around the canvas. It holds no three.js
   itself — the renderer lives behind <PanoramaViewerLazy>, so this island
   (and the page's first paint) never waits on that chunk.

   Room state lives in `?scene=`, written with router.replace: browser Back
   should leave the tour, not walk back through six rooms (plan §8.1). The
   camera's yaw/pitch deliberately stays out of the URL — it changes every
   frame. */
export function TourStage({
  tour,
  panel,
  header,
}: {
  tour: VirtualTour;
  panel: React.ReactNode;
  header: React.ReactNode;
}) {
  const t = useTranslations("virtualTour");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = params.get("scene");
  // An unknown ?scene= (a stale share link, a renamed room) falls back to the
  // entry scene rather than 404ing the whole tour.
  const scene =
    (requested ? sceneById(tour.scenes, requested) : undefined) ??
    sceneById(tour.scenes, tour.entryScene) ??
    tour.scenes[0];

  const [poi, setPoi] = React.useState<InfoHotspot | null>(null);
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    posthog.capture("virtual_tour_opened", {
      listing_id: tour.listingId,
      rooms: tour.scenes.length,
      entry_scene: scene.id,
    });
  }, [tour.listingId, tour.scenes.length, scene.id]);

  const goTo = React.useCallback(
    (sceneId: string, how: "hotspot" | "rail" | "keyboard") => {
      if (sceneId === scene.id) return;
      setPoi(null);
      posthog.capture("virtual_tour_scene_viewed", {
        listing_id: tour.listingId,
        scene_id: sceneId,
        from: scene.id,
        via: how,
      });
      router.replace(`${pathname}?scene=${sceneId}`, { scroll: false });
    },
    [pathname, router, scene.id, tour.listingId]
  );

  const openPoi = React.useCallback(
    (hotspot: InfoHotspot) => {
      setPoi(hotspot);
      posthog.capture("virtual_tour_hotspot_clicked", {
        listing_id: tour.listingId,
        scene_id: scene.id,
        kind: "info",
      });
    },
    [scene.id, tour.listingId]
  );

  /* ←/→ walk the room rail. Ignored while the focus is in a control that
     uses the arrows itself, so the rail's own buttons still behave. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const next = stepScene(tour.scenes, scene.id, e.key === "ArrowRight" ? 1 : -1);
      if (next) goTo(next.id, "keyboard");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, scene.id, tour.scenes]);

  return (
    <div className="flex flex-col lg:h-[calc(100svh-5rem)]">
      <div className="border-b bg-background/95">
        <div className="container mx-auto flex items-center gap-4 px-5 py-3 sm:px-8">
          {header}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {t("roomOf", { index: tour.scenes.indexOf(scene) + 1, total: tour.scenes.length })}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage. Fixed aspect on small screens so the page still scrolls to
            the panel below; fills the column from lg up. */}
        <div className="relative min-h-0 flex-1">
          <PanoramaViewerLazy
            key={tour.id}
            scene={scene}
            scenes={tour.scenes}
            onNavigate={(id) => goTo(id, "hotspot")}
            onOpenPoi={openPoi}
          />
          <RoomRail scenes={tour.scenes} activeId={scene.id} onSelect={(id) => goTo(id, "rail")} />
          <PoiPanel hotspot={poi} onClose={() => setPoi(null)} />
        </div>

        {/* Property info: a column beside the stage on desktop, the section
            under it on mobile. Server-rendered upstream — this is a slot. */}
        <aside className="w-full shrink-0 overflow-y-auto border-t p-5 sm:p-6 lg:w-[340px] lg:border-l lg:border-t-0">
          {panel}
        </aside>
      </div>
    </div>
  );
}
