"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ArrowLeft, CircleAlert, Eye, Info, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomCard } from "./room-card";
import { RoomUploader } from "./room-uploader";
import { FramingDialogLazy } from "./framing-dialog-lazy";
import { useVirtualTour } from "@/hooks/use-virtual-tour";
import { partitionIssues } from "@/lib/virtual-tour/publish";
import { validateTourGraph } from "@/lib/virtual-tour/scene-graph";
import type { Scene } from "@/schemas/virtual-tour";

/* The tour editor: rooms in, rooms named and ordered, one of them chosen as
   the way in, then published.

   Deliberately no hotspots yet (they are the next PR). A tour with no doors
   is still walkable — the room rail reaches every room — which is exactly why
   `unreachable-scene` is advisory here and not a publish blocker. */
export function TourEditor({ listingId }: { listingId: string }) {
  const t = useTranslations("virtualTourEditor");
  const tour = useVirtualTour(listingId);
  const [framing, setFraming] = React.useState<Scene | null>(null);

  /* Reordering is local while dragging — a request per hover would be absurd
     — and committed once on drop. */
  const [order, setOrder] = React.useState<string[] | null>(null);
  const scenes = React.useMemo(() => {
    const rooms = tour.tour?.scenes ?? [];
    if (!order) return rooms;
    const byId = new Map(rooms.map((s) => [s.id, s]));
    const dragged = order.flatMap((id) => byId.get(id) ?? []);
    // Anything added since the drag started keeps its place at the end.
    return dragged.length === rooms.length ? dragged : rooms;
  }, [tour.tour, order]);

  const move = (from: number, to: number) => {
    const ids = scenes.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    setOrder(ids);
  };

  const commitOrder = () => {
    if (!order) return;
    const ids = order;
    setOrder(null);
    tour.reorderScenes.mutate(ids, {
      onError: () => toast.error(t("saveFailed")),
    });
  };

  const fail = { onError: () => toast.error(t("saveFailed")) };

  const issues = React.useMemo(
    () =>
      tour.tour
        ? validateTourGraph({ ...tour.tour, scenes })
        : [{ code: "no-scenes" as const }],
    [tour.tour, scenes]
  );
  const { blocking, advisory } = partitionIssues(issues);
  const published = tour.tour?.status === "published";

  const publish = () => {
    tour.setStatus.mutate(published ? "draft" : "published", {
      onSuccess: () => {
        toast.success(published ? t("unpublished") : t("published"));
        posthog.capture("virtual_tour_published", {
          listing_id: listingId,
          rooms: scenes.length,
          published: !published,
        });
      },
      onError: () => toast.error(t("saveFailed")),
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

  return (
    <div className="container mx-auto px-5 py-8 sm:px-8">
      <Link
        href={`/apartments/${listingId}`}
        className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {t("backToListing")}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <Badge variant={published ? "default" : "secondary"}>
          {published ? t("statusPublished") : t("statusDraft")}
        </Badge>
      </div>
      <p className="mt-2 max-w-160 text-sm text-muted-foreground text-pretty">
        {t("intro")}
      </p>

      {scenes.length > 0 && (
        <DndProvider backend={HTML5Backend}>
          <div className="mt-6 flex flex-col gap-3">
            {scenes.map((scene, index) => (
              <RoomCard
                key={scene.id}
                scene={scene}
                index={index}
                isEntry={scene.id === tour.tour?.entryScene}
                disabled={tour.busy}
                move={move}
                onCommitOrder={commitOrder}
                onRename={(name) =>
                  tour.updateScene.mutate({ sceneId: scene.id, patch: { name } }, fail)
                }
                onKindChange={(room) =>
                  tour.updateScene.mutate({ sceneId: scene.id, patch: { room } }, fail)
                }
                onMakeEntry={() => tour.setEntryScene.mutate(scene.id, fail)}
                onFrame={() => setFraming(scene)}
                onRemove={() => tour.removeScene.mutate(scene, fail)}
              />
            ))}
          </div>
        </DndProvider>
      )}

      <div className="mt-4">
        <RoomUploader
          empty={scenes.length === 0}
          disabled={tour.busy}
          onAdd={(draft) => tour.addScene.mutateAsync(draft)}
        />
      </div>

      {/* What stands between this tour and a renter seeing it. Blocking
          issues are broken-tour problems; advisory ones are worth knowing
          and nothing more. */}
      {(blocking.length > 0 || advisory.length > 0) && (
        <ul className="mt-6 flex flex-col gap-2">
          {blocking.map((issue, i) => (
            <li
              key={`b${i}`}
              className="flex items-start gap-2.5 bg-secondary p-3 text-sm"
            >
              <CircleAlert size={17} className="mt-0.5 shrink-0 text-destructive" />
              <span className="text-pretty">{t(`issues.${issue.code}`)}</span>
            </li>
          ))}
          {advisory.map((issue, i) => (
            <li
              key={`a${i}`}
              className="flex items-start gap-2.5 p-3 text-sm text-muted-foreground"
            >
              <Info size={17} className="mt-0.5 shrink-0" />
              <span className="text-pretty">{t(`issues.${issue.code}`)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={publish}
          disabled={tour.busy || (!published && blocking.length > 0)}
          className="gap-2"
        >
          {tour.setStatus.isPending && <Loader2 size={16} className="animate-spin" />}
          {published ? t("unpublish") : t("publish")}
        </Button>
        {scenes.length > 0 && (
          <Button asChild variant="secondary" className="gap-2">
            <Link href={`/apartments/${listingId}/virtual-tour`}>
              <Eye size={16} /> {t("previewTour")}
            </Link>
          </Button>
        )}
      </div>

      <FramingDialogLazy
        scene={framing}
        open={framing !== null}
        onOpenChange={(open) => !open && setFraming(null)}
        onSave={(view) => {
          if (!framing) return;
          tour.updateScene.mutate(
            {
              sceneId: framing.id,
              patch: { yaw: view.yaw, pitch: view.pitch, hfov: view.hfov },
            },
            fail
          );
        }}
      />
    </div>
  );
}
