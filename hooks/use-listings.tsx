"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createListingAction,
  deleteListingAction,
  fetchMyListings,
  setListingStatusAction,
  updateListingAction,
} from "@/lib/actions/listings";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type Listing, type ListingCore } from "@/schemas/listing";

/* The signed-in owner's listings — the dashboard, the create/edit form, and
   the listing rows. Every query and mutation goes through the actions in
   @/lib/actions/listings, which re-check the session and the caller's
   ownership before touching a row; RLS is the backstop, not the only guard.

   react-query still owns the client-side cache and the optimistic flips
   below. What changed is only where the write happens: the actions expire the
   "listings"-tagged server cache themselves once a write succeeds, so public
   browse/detail pages pick up the change on their next request without this
   hook having to ask. */

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
      return unwrap(await fetchMyListings());
    },
  });

  const listings = useMemo(() => query.data ?? [], [query.data]);

  const getById = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  // The owner's own view is served by react-query; the server cache is the
  // action's responsibility, expired as part of the write itself.
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: key }),
    [queryClient, key]
  );

  const addMutation = useMutation({
    mutationFn: async ({
      core,
      status,
    }: {
      core: ListingCore;
      status: Listing["status"];
    }): Promise<Listing> => unwrap(await createListingAction(core, status)),
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
      unwrap(await updateListingAction(id, core, status));
    },
    onSuccess: invalidate,
  });

  /* Flip active ⇄ draft, optimistically. */
  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Listing["status"] }) => {
      unwrap(await setListingStatusAction(id, next));
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
      unwrap(await deleteListingAction(id));
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
