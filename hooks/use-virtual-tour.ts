"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { revalidateVirtualTour } from "@/lib/actions/virtual-tours";
import { deletePanorama } from "@/lib/supabase/storage";
import { toVirtualTour } from "@/lib/virtual-tour/tour-map";
import { pruneLinksTo } from "@/lib/virtual-tour/scene-graph";
import { HotspotSchema } from "@/schemas/virtual-tour";
import type { Hotspot, Scene, VirtualTour } from "@/schemas/virtual-tour";
import type { Tables } from "@/lib/database.types";

/* The owner's own tour, read and written through the browser Supabase client
   under RLS — the same shape as hooks/use-listings.

   Why not the service in lib/services/virtual-tours: that one reads *published*
   tours with the anon key inside a "use cache" boundary, which is right for
   renters and useless to an owner editing a draft. The row → domain mapping is
   shared (toVirtualTour has no `server-only` precisely so this can reuse it).

   Every write invalidates the react-query cache so the editor updates at once,
   then calls revalidateVirtualTour() so public pages pick the change up on
   their next request rather than after the cacheLife window. */

/* PostgREST needs the FK named: entry_scene_id makes a second foreign key
   between these tables, so an unqualified embed is ambiguous. */
const TOUR_WITH_SCENES =
  "*, virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)";

type SceneRow = Tables<"virtual_tour_scenes">;

/** The scene fields an owner can edit. */
export type SceneDraft = {
  name: string;
  room: Scene["room"];
  panoramaUrl: string;
  previewUrl: string;
};

export const virtualTourKeys = {
  byListing: (listingId: string) => ["virtual-tour", listingId] as const,
};

/** `updated_at` has no trigger (see the migration), so every write sets it. */
const touched = () => ({ updated_at: new Date().toISOString() });

export function useVirtualTour(listingId: string) {
  const queryClient = useQueryClient();
  const key = virtualTourKeys.byListing(listingId);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<VirtualTour | null> => {
      const supabase = createClient();
      // No status filter: the owner is editing, and a draft is the normal case.
      const { data, error } = await supabase
        .from("listing_virtual_tours")
        .select(TOUR_WITH_SCENES)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { virtual_tour_scenes: scenes, ...tour } = data;
      return toVirtualTour(tour, scenes);
    },
  });

  const settle = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: key });
    void revalidateVirtualTour();
  }, [key, queryClient]);

  /** The tour row for this listing, created on first use. Every mutation
      below funnels through here so the editor never has to think about
      whether the tour exists yet. */
  const ensureTour = useCallback(async (): Promise<string> => {
    const supabase = createClient();
    const existing = await supabase
      .from("listing_virtual_tours")
      .select("id")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data.id;

    const created = await supabase
      .from("listing_virtual_tours")
      .insert({ listing_id: listingId, status: "draft" })
      .select("id")
      .single();
    if (created.error) throw created.error;
    return created.data.id;
  }, [listingId]);

  const addScene = useMutation({
    mutationFn: async (draft: SceneDraft) => {
      const supabase = createClient();
      const tourId = await ensureTour();
      // Append: one past the current last room.
      const { data: last } = await supabase
        .from("virtual_tour_scenes")
        .select("sort_order")
        .eq("tour_id", tourId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("virtual_tour_scenes").insert({
        tour_id: tourId,
        name: draft.name,
        room: draft.room,
        panorama_url: draft.panoramaUrl,
        preview_url: draft.previewUrl,
        sort_order: (last?.sort_order ?? -1) + 1,
      });
      if (error) throw error;

      await supabase
        .from("listing_virtual_tours")
        .update(touched())
        .eq("id", tourId);
    },
    onSuccess: settle,
  });

  const updateScene = useMutation({
    mutationFn: async ({
      sceneId,
      patch,
    }: {
      sceneId: string;
      patch: Partial<Pick<SceneRow, "name" | "room" | "yaw" | "pitch" | "hfov">> & {
        hotspots?: Hotspot[];
      };
    }) => {
      const supabase = createClient();
      /* The column check only proves the value is a JSON array. Parsing here
         is what stops a half-built marker — a door with no target, a note
         with no body — reaching a renter's tour. */
      const { hotspots, ...rest } = patch;
      const row = {
        ...rest,
        ...(hotspots
          ? { hotspots: HotspotSchema.array().parse(hotspots) as SceneRow["hotspots"] }
          : {}),
      };

      const { error } = await supabase
        .from("virtual_tour_scenes")
        .update(row)
        .eq("id", sceneId);
      if (error) throw error;
    },
    onSuccess: settle,
  });

  /** Delete a room, and repair the rooms it breaks.

      A door in a *sibling* room pointing at the room going away is a blocking
      publish issue the owner never placed and cannot see from here — so the
      links are pruned in the same operation rather than discovered later. */
  const removeScene = useMutation({
    mutationFn: async (scene: Scene) => {
      const supabase = createClient();
      const before = queryClient.getQueryData<VirtualTour | null>(key)?.scenes ?? [];

      const { error } = await supabase
        .from("virtual_tour_scenes")
        .delete()
        .eq("id", scene.id);
      if (error) throw error;

      const pruned = pruneLinksTo(before, scene.id);
      if (pruned !== before) {
        // Only the rooms that actually changed: pruneLinksTo keeps the
        // identity of the ones it didn't touch.
        const writes = pruned
          .filter((next, i) => next !== before[i] && next.id !== scene.id)
          .map((next) =>
            supabase
              .from("virtual_tour_scenes")
              .update({ hotspots: next.hotspots })
              .eq("id", next.id)
          );
        const failed = (await Promise.all(writes)).find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      // The row is gone; the objects behind it are ours to clean up. Best
      // effort — a leaked object costs storage, a throw costs the edit.
      await deletePanorama(scene.panorama, scene.preview);
    },
    onSuccess: settle,
  });

  /** Persist a whole new order in one round trip. `sort_order` is rewritten
      from the array index, so the list the owner sees is the stored truth. */
  const reorderScenes = useMutation({
    mutationFn: async (sceneIds: string[]) => {
      const supabase = createClient();
      const results = await Promise.all(
        sceneIds.map((id, index) =>
          supabase.from("virtual_tour_scenes").update({ sort_order: index }).eq("id", id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: settle,
  });

  const setEntryScene = useMutation({
    mutationFn: async (sceneId: string) => {
      const supabase = createClient();
      const tourId = await ensureTour();
      const { error } = await supabase
        .from("listing_virtual_tours")
        .update({ entry_scene_id: sceneId, ...touched() })
        .eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: settle,
  });

  /** Publish or unpublish. The trigger on the table maintains
      listings.has_virtual_tour from here, so nothing else has to. */
  const setStatus = useMutation({
    mutationFn: async (status: VirtualTour["status"]) => {
      const supabase = createClient();
      const tourId = await ensureTour();
      const { error } = await supabase
        .from("listing_virtual_tours")
        .update({ status, ...touched() })
        .eq("id", tourId);
      if (error) throw error;
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
