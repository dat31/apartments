"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import {
  createSavedSearchAction,
  deleteSavedSearchAction,
  fetchMySavedSearches,
  setSavedSearchAlertsAction,
} from "@/lib/actions/saved-searches";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import {
  SAVED_SEARCH_MAX,
  type SavedSearch,
} from "@/schemas/saved-search";

/* The signed-in renter's saved searches, read and written through the actions
   in @/lib/actions/saved-searches. No guest mode: alerts need an email
   address, so saving is honestly gated on sign-in (see the improvement doc).
   Alert/delete mutations are optimistic — the strip is the only consumer, and
   a failed write rolls the card back. */

export const savedSearchKeys = {
  list: (userId: string | undefined) =>
    ["saved-searches", userId ?? "guest"] as const,
};

export function useSavedSearches() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;
  const key = savedSearchKeys.list(userId);

  const query = useQuery({
    queryKey: key,
    enabled: !userPending,
    queryFn: async (): Promise<SavedSearch[]> => {
      if (!userId) return [];
      return unwrap(await fetchMySavedSearches());
    },
  });

  const searches = useMemo(() => query.data ?? [], [query.data]);

  const addMutation = useMutation({
    mutationFn: async ({
      name,
      queryString,
      alerts,
    }: {
      name: string;
      queryString: string;
      alerts: boolean;
    }) => {
      // Alert emails go out in the language the search was saved in.
      unwrap(
        await createSavedSearchAction({
          name,
          queryString,
          alerts,
          locale: locale as "vi" | "en",
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      unwrap(await setSavedSearchAlertsAction(id, next));
    },
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedSearch[]>(key);
      queryClient.setQueryData<SavedSearch[]>(key, (old) =>
        old?.map((s) => (s.id === id ? { ...s, alerts: next } : s))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      unwrap(await deleteSavedSearchAction(id));
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedSearch[]>(key);
      queryClient.setQueryData<SavedSearch[]>(key, (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const addSearch = useCallback(
    (input: { name: string; queryString: string; alerts: boolean }) =>
      addMutation.mutateAsync(input),
    [addMutation]
  );

  const toggleAlerts = useCallback(
    (id: string) => {
      const cur = searches.find((s) => s.id === id);
      if (cur) toggleMutation.mutate({ id, next: !cur.alerts });
    },
    [searches, toggleMutation]
  );

  const removeSearch = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation]
  );

  return {
    searches,
    addSearch,
    toggleAlerts,
    removeSearch,
    adding: addMutation.isPending,
    atCap: searches.length >= SAVED_SEARCH_MAX,
    ready: !userPending && !query.isLoading,
  };
}
