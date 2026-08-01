"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSceneAction,
  fetchOwnedTour,
  removeSceneAction,
  reorderScenesAction,
  setEntrySceneAction,
  setTourStatusAction,
  updateSceneAction,
} from "@/lib/actions/virtual-tours";
import { unwrap } from "@/lib/actions/result";
import type {
  SceneDraft,
  ScenePatch,
} from "@/lib/services/virtual-tours";
import type { Scene, VirtualTour } from "@/schemas/virtual-tour";

/* The owner's own tour, read and written through the actions in
   @/lib/actions/virtual-tours.

   Why not the cached reads in the same service: those serve *published* tours
   with the anon key inside a "use cache" boundary, which is right for renters
   and useless to an owner editing a draft. getOwnedTour is the draft-aware
   twin, on the cookie-bound client.

   What used to live here was the multi-step editing logic — look up the tour,
   create it if absent, find the last sort_order, insert, touch the parent row —
   as separate browser round trips. All of that is one call now, and the doors
   pruned when a room is deleted are computed from the stored scenes rather
   than from whatever this cache happened to hold.

   Every write invalidates the react-query cache so the editor updates at once;
   the actions expire the public tour caches themselves. */

export type { SceneDraft };

export const virtualTourKeys = {
  byListing: (listingId: string) => ["virtual-tour", listingId] as const,
};

export function useVirtualTour(listingId: string) {
  const queryClient = useQueryClient();
  const key = virtualTourKeys.byListing(listingId);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<VirtualTour | null> =>
      unwrap(await fetchOwnedTour(listingId)),
  });

  const settle = useCallback(
    () => queryClient.invalidateQueries({ queryKey: key }),
    [key, queryClient]
  );

  const addScene = useMutation({
    mutationFn: async (draft: SceneDraft) => {
      unwrap(await addSceneAction(listingId, draft));
    },
    onSuccess: settle,
  });

  const updateScene = useMutation({
    mutationFn: async ({
      sceneId,
      patch,
    }: {
      sceneId: string;
      patch: ScenePatch;
    }) => {
      unwrap(await updateSceneAction(listingId, sceneId, patch));
    },
    onSuccess: settle,
  });

  /** Delete a room, and repair the rooms it breaks — see removeScene in the
      service for why the two are one operation. */
  const removeScene = useMutation({
    mutationFn: async (scene: Scene) => {
      unwrap(await removeSceneAction(listingId, scene.id));
    },
    onSuccess: settle,
  });

  /** Persist a whole new order in one round trip. */
  const reorderScenes = useMutation({
    mutationFn: async (sceneIds: string[]) => {
      unwrap(await reorderScenesAction(listingId, sceneIds));
    },
    onSuccess: settle,
  });

  const setEntryScene = useMutation({
    mutationFn: async (sceneId: string) => {
      unwrap(await setEntrySceneAction(listingId, sceneId));
    },
    onSuccess: settle,
  });

  /** Publish or unpublish. */
  const setStatus = useMutation({
    mutationFn: async (status: VirtualTour["status"]) => {
      unwrap(await setTourStatusAction(listingId, status));
    },
    onSuccess: settle,
  });

  const busy =
    addScene.isPending ||
    updateScene.isPending ||
    removeScene.isPending ||
    reorderScenes.isPending ||
    setEntryScene.isPending ||
    setStatus.isPending;

  return useMemo(
    () => ({
      tour: query.data ?? null,
      isLoading: query.isPending,
      error: query.error,
      busy,
      addScene,
      updateScene,
      removeScene,
      reorderScenes,
      setEntryScene,
      setStatus,
    }),
    [
      query.data,
      query.isPending,
      query.error,
      busy,
      addScene,
      updateScene,
      removeScene,
      reorderScenes,
      setEntryScene,
      setStatus,
    ]
  );
}
