"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAvailability,
  replaceMyWeekAction,
  toggleMySlotAction,
} from "@/lib/actions/availability";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Owner tour-availability (one row per available weekday/time slot). Reads are
   public — a renter needs to see a listing owner's slots to book — so
   `useAvailability(ownerId)` works for any owner. Writes are the signed-in
   owner's own, exposed by `useMyAvailability()` with optimistic toggles; the
   actions decide whose week is being edited, not this hook. */

export const availabilityKeys = {
  owner: (ownerId: string | undefined) =>
    ["availability", ownerId ?? "none"] as const,
};

/** A week a Server Component already read, handed in so the first render —
    on both sides — has the real thing instead of an empty grid. */
export type AvailabilitySeed = { ownerId: string; template: WeekTemplate };

/** One owner's weekly availability template (public read). */
export function useAvailability(
  ownerId: string | undefined,
  initialTemplate?: WeekTemplate
) {
  const query = useQuery({
    queryKey: availabilityKeys.owner(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<WeekTemplate> =>
      unwrap(await fetchAvailability(ownerId!)),
    initialData: initialTemplate,
  });

  const template = query.data ?? {};
  return { template, ready: !ownerId || !query.isLoading };
}

/** The signed-in owner's own availability, with editing.

    `seed` is what lets a server-rendered editor paint the real week: without
    it the owner id arrives from useUser() only after mount, so the query
    can't even start until then and the grid renders empty first. With it,
    both the id and the data are there on the first render — the mutations
    below are unaffected either way, since the actions take the owner from the
    session and this id is only a cache key. */
export function useMyAvailability(seed?: AvailabilitySeed) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const ownerId = seed?.ownerId ?? user?.id;
  const { template, ready } = useAvailability(ownerId, seed?.template);
  const key = availabilityKeys.owner(ownerId);

  const setCache = useCallback(
    (next: WeekTemplate) => queryClient.setQueryData(key, next),
    [queryClient, key]
  );

  /* Add or remove a single slot. */
  const toggleMutation = useMutation({
    mutationFn: async ({
      weekday,
      time,
      active,
    }: {
      weekday: number;
      time: string;
      active: boolean;
    }) => {
      unwrap(await toggleMySlotAction({ weekday, time, active }));
    },
    onMutate: async ({ weekday, time, active }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WeekTemplate>(key);
      const cur = previous?.[weekday] ?? [];
      const nextTimes = active
        ? cur.filter((x) => x !== time)
        : [...cur, time].sort();
      setCache({ ...previous, [weekday]: nextTimes });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) setCache(ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  /* Replace the whole week (used by the presets). */
  const replaceMutation = useMutation({
    mutationFn: async (next: WeekTemplate) => {
      unwrap(await replaceMyWeekAction(next));
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WeekTemplate>(key);
      setCache(next);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) setCache(ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const toggle = useCallback(
    (weekday: number, time: string) => {
      const active = (template[weekday] ?? []).includes(time);
      toggleMutation.mutate({ weekday, time, active });
    },
    [template, toggleMutation]
  );

  const replaceWeek = useCallback(
    (next: WeekTemplate) => replaceMutation.mutate(next),
    [replaceMutation]
  );

  const total = useMemo(
    () =>
      Object.values(template).reduce((sum, times) => sum + (times?.length ?? 0), 0),
    [template]
  );

  return { template, total, toggle, replaceWeek, ready };
}
