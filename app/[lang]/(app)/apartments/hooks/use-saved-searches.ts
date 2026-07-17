"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import {
  SAVED_SEARCH_MAX,
  type SavedSearch,
} from "@/schemas/saved-search";
import type { Tables } from "@/lib/database.types";

/* The signed-in renter's saved searches, backed by the Supabase
   `saved_searches` table and react-query. No guest mode: alerts need an email
   address, so saving is honestly gated on sign-in (see the improvement doc).
   Alert/delete mutations are optimistic — the strip is the only consumer, and
   a failed write rolls the card back. */

export const savedSearchKeys = {
  list: (userId: string | undefined) =>
    ["saved-searches", userId ?? "guest"] as const,
};

function toSavedSearch(row: Tables<"saved_searches">): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    queryString: row.query_string,
    alerts: row.alerts,
    createdAt: row.created_at,
  };
}

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
      const supabase = createClient();
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(toSavedSearch);
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
      if (!userId) throw new Error("Not signed in");
      const supabase = createClient();
      const { error } = await supabase.from("saved_searches").insert({
        profile_id: userId,
        name,
        query_string: queryString,
        alerts,
        // Alert emails are sent in the language the search was saved in.
        locale,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("saved_searches")
        .update({ alerts: next })
        .eq("id", id);
      if (error) throw error;
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
      const supabase = createClient();
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
