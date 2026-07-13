"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { revalidateListings } from "@/lib/actions/listings";
import { useUser } from "@/hooks/auth";
import { toListing, toListingWrite } from "@/lib/services/listings-map";
import { PALETTE } from "@/lib/data/listings";
import { type Listing, type ListingCore } from "@/schemas/listing";
import type { TablesInsert } from "@/lib/database.types";

/* The signed-in owner's listings, backed by the Supabase `listings` table and
   react-query. Replaces the old in-memory seed store — the dashboard, the
   create/edit form, and the listing rows all read and write real rows scoped
   to owner_id (RLS lets an owner see their own drafts alongside active homes,
   and insert/update/delete only their own).

   Writes invalidate the react-query cache so the dashboard reflects
   immediately, and call the revalidateListings server action to expire the
   "listings"-tagged server cache (getActiveListings & co.), so public
   browse/detail pages pick up the change on their next request too. */

export const listingKeys = {
  mine: (userId: string | undefined) => ["listings", "mine", userId ?? "guest"] as const,
};

export function useListings() {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;
  const key = listingKeys.mine(userId);

  const query = useQuery({
    queryKey: key,
    enabled: !userPending,
    queryFn: async (): Promise<Listing[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(toListing);
    },
  });

  const listings = useMemo(() => query.data ?? [], [query.data]);

  const getById = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  const invalidate = useCallback(() => {
    // Fire-and-forget: the owner's own view is served by react-query; the
    // server cache only affects what other visitors see next.
    void revalidateListings();
    return queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, key]);

  const addMutation = useMutation({
    mutationFn: async ({
      core,
      status,
    }: {
      core: ListingCore;
      status: Listing["status"];
    }): Promise<Listing> => {
      if (!userId) throw new Error("Not signed in");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        // ListingCore guarantees the insert-required fields; toListingWrite
        // widens them to optional (it's shared with the update path), so cast.
        .insert({
          ...toListingWrite(core, status),
          owner_id: userId,
          palette: Math.floor(Math.random() * PALETTE.length),
        } as TablesInsert<"listings">)
        .select("*")
        .single();
      if (error) throw error;
      return toListing(data);
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      core,
      status,
    }: {
      id: string;
      core: ListingCore;
      status: Listing["status"];
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("listings")
        .update(toListingWrite(core, status))
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /* Flip active ⇄ draft, optimistically. */
  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Listing["status"] }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("listings")
        .update({ status: next })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Listing[]>(key);
      queryClient.setQueryData<Listing[]>(key, (old) =>
        old?.map((l) => (l.id === id ? { ...l, status: next } : l))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Listing[]>(key);
      queryClient.setQueryData<Listing[]>(key, (old) =>
        old?.filter((l) => l.id !== id)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: invalidate,
  });

  const addListing = useCallback(
    (core: ListingCore, status: Listing["status"]) =>
      addMutation.mutateAsync({ core, status }),
    [addMutation]
  );

  const updateListing = useCallback(
    (id: string, core: ListingCore, status: Listing["status"]) =>
      updateMutation.mutateAsync({ id, core, status }),
    [updateMutation]
  );

  const removeListing = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation]
  );

  const toggleStatus = useCallback(
    (id: string) => {
      const cur = listings.find((l) => l.id === id);
      if (!cur) return;
      toggleMutation.mutate({
        id,
        next: cur.status === "active" ? "draft" : "active",
      });
    },
    [listings, toggleMutation]
  );

  return {
    listings,
    getById,
    addListing,
    updateListing,
    removeListing,
    toggleStatus,
    ready: !userPending && !query.isLoading,
  };
}
