"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, Loader2, Rotate3d } from "lucide-react";
import posthog from "posthog-js";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaptureHelpDialog } from "./capture-help-dialog";
import { ReadinessPanel } from "./readiness-panel";
import { RoomInspector } from "./room-inspector";
import { RoomList } from "./room-list";
import { RoomStageLazy } from "./room-stage-lazy";
import { RoomUploader } from "./room-uploader";
import { TourEmptyState } from "./tour-empty-state";
import { useVirtualTour } from "@/hooks/use-virtual-tour";
import {
  countMarkers,
  isDoorTo,
  moveHotspot,
  nudgeHotspot,
  removeHotspot,
  upsertHotspot,
  type Direction,
} from "@/lib/virtual-tour/hotspots";
import { partitionIssues } from "@/lib/virtual-tour/publish";
import { sceneById, validateTourGraph, type TourIssue } from "@/lib/virtual-tour/scene-graph";
import type { Hotspot, NoteFormValues, Scene } from "@/schemas/virtual-tour";

/* The 360° tour editor.

   One surface, because a room is both a thing in a list and a place you go
   into: naming and ordering happen in the rail, framing the arrival view and
   placing markers happen inside the room, and a host doing the second is
   never more than a click from the first. One engine mount, at the centre.

   Nothing here is visible to a renter until the tour is published — and
   because a published tour is served straight from these rows, editing a live
   tour changes what renters see immediately. That is stated on the page
   rather than staged, which would be a schema decision (a published snapshot
   separate from the working rows) and not a UI one. */
export function TourEditor({ listingId }: { listingId: string }) {
  const t = useTranslations("virtualTourEditor");
  const tour = useVirtualTour(listingId);

  const [selectedSceneId, setSelectedSceneId] = React.useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = React.useState<string | null>(null);
  const [aim, setAim] = React.useState<Aim | null>(null);
  /* A placed note has nowhere to live until it says something — both fields
     are required — so it waits here while the host writes it. */
  const [pendingNote, setPendingNote] = React.useState<Direction | null>(null);
  const [returnPrompt, setReturnPrompt] = React.useState<{ from: Scene; to: Scene } | null>(
    null
  );
  const [look, setLook] = React.useState<Direction | null>(null);
  const [howTo, setHowTo] = React.useState(false);

  const scenes = React.useMemo(() => tour.tour?.scenes ?? [], [tour.tour]);
  const scene =
    (selectedSceneId ? sceneById(scenes, selectedSceneId) : undefined) ?? scenes[0] ?? null;
  const entryId = tour.tour?.entryScene ?? scenes[0]?.id ?? "";
  const published = tour.tour?.status === "published";
  const fail = { onError: () => toast.error(t("saveFailed")) };

  const issues = React.useMemo(
    () => (tour.tour ? validateTourGraph(tour.tour) : [{ code: "no-scenes" as const }]),
    [tour.tour]
  );
  const { blocking, advisory } = partitionIssues(issues);
  const markers = countMarkers(scenes);

  /* ---- rooms ---- */

  const saveHotspots = (target: Scene, hotspots: Hotspot[]) =>
    tour.updateScene.mutate({ sceneId: target.id, patch: { hotspots } }, fail);

  const moveRoom = (id: string, direction: -1 | 1) => {
    const ids = scenes.map((s) => s.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    tour.reorderScenes.mutate(ids, fail);
  };

  const removeRoom = (target: Scene) => {
    // Counted before the delete, because after it the doors are gone: a host
    // who deletes the bathroom has to be told, here, that two doors elsewhere
    // just stopped leading anywhere.
    const broken = scenes.reduce(
      (n, s) =>
        s.id === target.id ? n : n + s.hotspots.filter((h) => isDoorTo(h, target.id)).length,
      0
    );
    tour.removeScene.mutate(target, {
      onSuccess: () => {
        toast.success(
          broken > 0
            ? t("removedRoomBroke", { room: target.name, count: broken })
            : t("removedRoom", { room: target.name })
        );
      },
      onError: fail.onError,
    });
    if (selectedSceneId === target.id) setSelectedSceneId(null);
    setSelectedHotspotId(null);
    setAim(null);
    setPendingNote(null);
  };

  /* ---- markers ---- */

  const select = (id: string) => {
    if (!scene) return;
    setSelectedHotspotId(id);
    const hotspot = scene.hotspots.find((h) => h.id === id);
    // Turning to face it is what makes the list a way of reaching a marker
    // behind the host — or one of two sitting on top of each other.
    if (hotspot) setLook({ yaw: hotspot.yaw, pitch: hotspot.pitch });
  };

  const place = (dir: Direction) => {
    if (!scene || !aim) return;

    if (aim.kind === "move") {
      const hotspot = scene.hotspots.find((h) => h.id === aim.hotspotId);
      if (hotspot) saveHotspots(scene, upsertHotspot(scene.hotspots, moveHotspot(hotspot, dir)));
      setAim(null);
      return;
    }

    if (aim.kind === "note") {
      setAim(null);
      setPendingNote(dir);
      return;
    }

    const target = sceneById(scenes, aim.target);
    if (!target) return;
    const door: Hotspot = {
      id: crypto.randomUUID(),
      kind: "link",
      ...dir,
      // The renter's tour reads the target room's *current* name; this is the
      // fallback for a target that is gone. See doorLabel().
      label: target.name,
      target: target.id,
    };
    saveHotspots(scene, [...scene.hotspots, door]);
    setAim(null);
    setSelectedHotspotId(door.id);
    posthog.capture("virtual_tour_hotspot_placed", { listing_id: listingId, kind: "link" });
    toast.success(t("doorPlaced", { room: target.name }));

    /* A door is placed in one room, not two: the way back is rarely at the
       mirrored spot, and a one-way route through a hallway is legitimate. So
       it is offered, not created. */
    if (!target.hotspots.some((h) => isDoorTo(h, scene.id))) {
      setReturnPrompt({ from: scene, to: target });
    }
  };

  const saveNote = (values: NoteFormValues) => {
    if (!scene || !pendingNote) return;
    const note: Hotspot = {
      id: crypto.randomUUID(),
      kind: "info",
      ...pendingNote,
      label: values.label,
      body: values.body,
    };
    saveHotspots(scene, [...scene.hotspots, note]);
    setPendingNote(null);
    setSelectedHotspotId(note.id);
    posthog.capture("virtual_tour_hotspot_placed", { listing_id: listingId, kind: "info" });
  };

  const patchHotspot = (id: string, change: (hotspot: Hotspot) => Hotspot) => {
    if (!scene) return;
    const hotspot = scene.hotspots.find((h) => h.id === id);
    if (!hotspot) return;
    saveHotspots(scene, upsertHotspot(scene.hotspots, change(hotspot)));
  };

  const startAim = (next: Aim) => {
    setAim(next);
    setPendingNote(null);
    setReturnPrompt(null);
  };

  /* Take the host to whatever the checklist is complaining about. */
  const fix = (issue: TourIssue) => {
    if (!("sceneId" in issue)) return;
    setSelectedSceneId(issue.sceneId);
    setAim(null);
    setSelectedHotspotId("hotspotId" in issue ? issue.hotspotId : null);
  };

  const publish = () => {
    tour.setStatus.mutate(published ? "draft" : "published", {
      onSuccess: () => {
        toast.success(published ? t("unpublished") : t("published"));
        posthog.capture("virtual_tour_published", {
          listing_id: listingId,
          rooms: scenes.length,
          doors: markers.doors,
          notes: markers.notes,
          published: !published,
        });
      },
      onError: fail.onError,
    });
  };

  if (tour.isLoading) {
    return (
      <div className="container mx-auto px-5 py-8 sm:px-8">
        <Skeleton className="skeleton h-8 w-64" />
        <Skeleton className="skeleton mt-6 h-32 w-full" />
      </div>
    );
  }

  const uploader = (
    <RoomUploader
      empty={scenes.length === 0}
      disabled={tour.busy}
      onAdd={(draft) => tour.addScene.mutateAsync(draft)}
    />
  );

  const stageAim =
    aim === null
      ? null
      : aim.kind === "door"
        ? {
            prompt: t("aimDoor", { room: sceneById(scenes, aim.target)?.name ?? "" }),
            confirm: t("placeDoor"),
          }
        : aim.kind === "note"
          ? { prompt: t("aimNote"), confirm: t("placeNote") }
          : { prompt: t("aimMove"), confirm: t("placeMove") };

  return (
    <div className="container mx-auto px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/apartments/${listingId}`}
            className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> {t("backToListing")}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
            <Badge variant={published ? "default" : "secondary"} className="gap-1">
              <Rotate3d size={12} />
              {published ? t("statusPublished") : t("statusDraft")}
            </Badge>
          </div>
          {scenes.length > 0 && (
            <p className="mt-1.5 text-[13px] tabular-nums text-muted-foreground">
              {t("summary", {
                rooms: scenes.length,
                doors: markers.doors,
                notes: markers.notes,
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scenes.length > 0 && (
            <Button asChild variant="secondary" className="gap-2">
              <Link href={`/apartments/${listingId}/virtual-tour`}>
                <Eye size={16} /> {t("previewTour")}
              </Link>
            </Button>
          )}
          <Button
            onClick={publish}
            disabled={tour.busy || (!published && blocking.length > 0)}
            variant={published ? "ghost" : "default"}
            className="gap-2"
          >
            {tour.setStatus.isPending && <Loader2 size={16} className="animate-spin" />}
            {published ? t("unpublish") : t("publish")}
          </Button>
        </div>
      </div>

      {published && (
        <p className="mt-5 bg-card p-4 text-[13.5px] text-pretty sm:p-5">
          <Eye size={16} className="mr-2 -mt-0.5 inline text-primary" />
          <span className="font-semibold">{t("liveWarnTitle")}</span>{" "}
          <span className="text-muted-foreground">{t("liveWarnBody")}</span>
        </p>
      )}

      <div className="mt-5">
        <ReadinessPanel
          blocking={blocking}
          advisory={advisory}
          scenes={scenes}
          onFix={fix}
        />
      </div>

      {!scene ? (
        <div className="mt-5">
          <TourEmptyState uploader={uploader} onHowTo={() => setHowTo(true)} />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4 lg:flex-row">
          <aside className="flex flex-col gap-3 lg:w-80 lg:shrink-0">
            <RoomList
              scenes={scenes}
              selectedId={scene.id}
              entryId={entryId}
              disabled={tour.busy}
              onSelect={(id) => {
                setSelectedSceneId(id);
                setSelectedHotspotId(null);
                setAim(null);
                setPendingNote(null);
                setReturnPrompt(null);
              }}
              onMove={moveRoom}
              onRemove={removeRoom}
            />
            {uploader}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4 xl:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <RoomStageLazy
                scene={scene}
                scenes={scenes}
                aim={stageAim}
                selectedId={selectedHotspotId}
                look={look}
                onPlace={place}
                onCancelAim={() => setAim(null)}
                onSelect={select}
                onMove={(id, dir) => patchHotspot(id, (h) => moveHotspot(h, dir))}
                onSaveView={(view) =>
                  tour.updateScene.mutate(
                    { sceneId: scene.id, patch: view },
                    {
                      onSuccess: () => toast.success(t("arrivalSaved")),
                      onError: fail.onError,
                    }
                  )
                }
              />

              {returnPrompt && (
                <div className="bg-card p-4">
                  <p className="text-[14.5px] font-medium text-pretty">
                    {t("returnAsk", {
                      from: returnPrompt.from.name,
                      to: returnPrompt.to.name,
                    })}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground text-pretty">
                    {t("returnWhy")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const { from, to } = returnPrompt;
                        setReturnPrompt(null);
                        setSelectedSceneId(to.id);
                        setSelectedHotspotId(null);
                        setAim({ kind: "door", target: from.id });
                      }}
                    >
                      <ArrowRight size={15} /> {t("returnYes")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReturnPrompt(null)}>
                      {t("returnNo")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="xl:w-88 xl:shrink-0">
              <RoomInspector
                scene={scene}
                scenes={scenes}
                isEntry={scene.id === entryId}
                selectedHotspotId={selectedHotspotId}
                pendingNoteYaw={pendingNote?.yaw ?? null}
                disabled={tour.busy}
                onRename={(name) =>
                  tour.updateScene.mutate({ sceneId: scene.id, patch: { name } }, fail)
                }
                onKindChange={(room) =>
                  tour.updateScene.mutate({ sceneId: scene.id, patch: { room } }, fail)
                }
                onMakeEntry={() => tour.setEntryScene.mutate(scene.id, fail)}
                onAddDoor={(target) => startAim({ kind: "door", target })}
                onAddNote={() => startAim({ kind: "note" })}
                onSaveNote={saveNote}
                onCancelNote={() => setPendingNote(null)}
                onSelectHotspot={select}
                onNudge={(id, dYaw, dPitch) =>
                  patchHotspot(id, (h) => nudgeHotspot(h, dYaw, dPitch))
                }
                onRepoint={(id, target) =>
                  patchHotspot(id, (h) =>
                    h.kind === "link"
                      ? {
                          ...h,
                          target,
                          label: sceneById(scenes, target)?.name ?? h.label,
                        }
                      : h
                  )
                }
                onMoveMarker={(id) => startAim({ kind: "move", hotspotId: id })}
                onEditNote={(id, values) =>
                  patchHotspot(id, (h) =>
                    h.kind === "info" ? { ...h, label: values.label, body: values.body } : h
                  )
                }
                onRemoveHotspot={(id) => {
                  saveHotspots(scene, removeHotspot(scene.hotspots, id));
                  if (selectedHotspotId === id) setSelectedHotspotId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <CaptureHelpDialog open={howTo} onOpenChange={setHowTo} />
    </div>
  );
}

/** What the host is being asked to point the crosshair at. */
type Aim =
  | { kind: "door"; target: string }
  | { kind: "note" }
  | { kind: "move"; hotspotId: string };
