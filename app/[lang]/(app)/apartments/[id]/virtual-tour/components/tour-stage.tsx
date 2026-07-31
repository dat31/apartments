"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { ChevronUp, Rotate3d, X } from "lucide-react";
import { PanoramaViewerLazy } from "./panorama-viewer-lazy";
import { PoiPanel } from "./poi-panel";
import { RoomRail } from "./room-rail";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/utils";
import { sceneById, stepScene } from "@/lib/virtual-tour/scene-graph";
import type { InfoHotspot, VirtualTour } from "@/schemas/virtual-tour";

/* The tour's client orchestrator: which room is on screen, which point of
   interest is open, and the layout around the canvas. It holds no three.js
   itself — the renderer lives behind <PanoramaViewerLazy>, so this island
   (and the page's first paint) never waits on that chunk.

   The room fills the screen and every control floats on top of it as dark
   glass: a renter is deciding whether this home is worth an hour across Da
   Nang, and the photograph is what answers that. The shell scopes itself to
   `.dark` so the booking components it borrows from the detail page — which
   are theme-token styled — sit on that glass in their dark palette instead
   of punching light rectangles through it.

   Room state lives in `?scene=`, written with router.replace: browser Back
   should leave the tour, not walk back through six rooms (plan §8.1). The
   camera's yaw/pitch deliberately stays out of the URL — it changes every
   frame. */
export function TourStage({
  tour,
  listingTitle,
  panel,
  header,
  summary,
  cta,
}: {
  tour: VirtualTour;
  listingTitle: string;
  panel: React.ReactNode;
  header: React.ReactNode;
  summary: React.ReactNode;
  cta: React.ReactNode;
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
  // Phone-sized screens keep the essentials folded into a one-line bar until
  // asked for; from lg up there is room for the panel beside the stage.
  const [essentialsOpen, setEssentialsOpen] = React.useState(false);
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
    <div className="dark tour-shell relative flex h-[calc(100svh-5rem)] min-h-140 flex-col overflow-hidden">
      {/* The room itself, edge to edge. Everything below is layered on it. */}
      <PanoramaViewerLazy
        key={tour.id}
        scene={scene}
        scenes={tour.scenes}
        activePoiId={poi?.id ?? null}
        onNavigate={(id) => goTo(id, "hotspot")}
        onOpenPoi={openPoi}
      />

      {/* While the host's note is being read, the room steps back. */}
      {poi && <span className="pano-dim z-10" aria-hidden="true" />}

      {/* Top chrome: the way out, where you are, and the way to send this
          room to whoever is deciding with you. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-3 sm:p-4">
        <div className="tour-glass pointer-events-auto max-w-[min(60%,24rem)] px-3.5 py-2.5">
          {header}
        </div>
        <div className="tour-glass pointer-events-auto hidden h-11 min-w-0 items-center gap-2.5 px-3.5 sm:flex">
          <Rotate3d size={16} className="shrink-0 text-white/80" />
          <span className="truncate text-[13.5px] font-semibold">{scene.name}</span>
          <span className="whitespace-nowrap text-[11.5px] tabular-nums text-white/65">
            {t("roomOf", {
              index: tour.scenes.indexOf(scene) + 1,
              total: tour.scenes.length,
            })}
          </span>
        </div>
        <div className="pointer-events-auto ml-auto shrink-0">
          {/* Shares the room you are standing in: `?scene=` is already in the
              URL, so the link lands a partner or a parent where you are. */}
          <ShareButton
            title={listingTitle}
            iconOnly
            variant="ghost"
            className="tour-glass tour-glass-btn size-11"
          />
        </div>
      </div>

      {/* Essentials. One instance: the fixed column from lg up, and the sheet
          the phone bar unfolds below that — never both, so the booking CTAs
          are never mounted twice. */}
      <div
        id="tour-essentials"
        className={cn(
          "tour-glass absolute z-20 overflow-y-auto p-5",
          "lg:inset-x-auto lg:right-4 lg:top-28 lg:bottom-auto lg:block lg:max-h-[calc(100%-16rem)] lg:w-88",
          essentialsOpen ? "inset-x-3 top-28 bottom-32 sm:inset-x-4" : "hidden"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <span className="text-[13px] font-semibold">{t("essentials")}</span>
          <button
            type="button"
            onClick={() => setEssentialsOpen(false)}
            aria-label={t("poiClose")}
            className="tour-glass-btn focus-ring inline-flex size-9 items-center justify-center"
          >
            <X size={17} />
          </button>
        </div>
        {panel}
      </div>

      <PoiPanel hotspot={poi} onClose={() => setPoi(null)} />

      {/* Bottom chrome: the rooms, then the money. */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 sm:p-4"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <RoomRail scenes={tour.scenes} activeId={scene.id} onSelect={(id) => goTo(id, "rail")} />

        {!essentialsOpen && (
          <div className="flex items-stretch gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setEssentialsOpen(true)}
              aria-expanded={essentialsOpen}
              aria-controls="tour-essentials"
              className="tour-glass tour-glass-btn focus-ring flex h-14 min-w-0 flex-1 items-center gap-2.5 px-4 text-left"
            >
              {summary}
              <ChevronUp size={16} className="ml-auto shrink-0 text-white/70" />
            </button>
            {cta}
          </div>
        )}
      </div>
    </div>
  );
}
