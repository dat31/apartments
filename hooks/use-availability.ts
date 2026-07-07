"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { toWeekTemplate, toAvailabilityRows } from "@/lib/services/availability-map";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Owner tour-availability, backed by the Supabase `owner_availability` table
   (one row per available weekday/time slot). Reads are public — a renter needs
   to see a listing owner's slots to book — so `useAvailability(ownerId)` works
   for any owner. Writes are the signed-in owner's own, exposed by
   `useMyAvailability()` with optimistic toggles. */

export const availabilityKeys = {
  owner: (ownerId: string | undefined) =>
    ["availability", ownerId ?? "none"] as const,
};

/** One owner's weekly availability template (public read). */
export function useAvailability(ownerId: string | undefined) {
  const query = useQuery({
    queryKey: availabilityKeys.owner(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<WeekTemplate> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("owner_availability")
        .select("*")
        .eq("owner_id", ownerId!);
      if (error) throw error;
      return toWeekTemplate(data);
    },
  });

  const template = query.data ?? {};
  return { template, ready: !ownerId || !query.isLoading };
}

/** The signed-in owner's own availability, with editing. */
export function useMyAvailability() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const ownerId = user?.id;
  const { template, ready } = useAvailability(ownerId);
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
      if (!ownerId) throw new Error("Not signed in");
      const supabase = createClient();
      const { error } = active
        ? await supabase
            .from("owner_availability")
            .delete()
            .match({ owner_id: ownerId, weekday, time })
        : await supabase
            .from("owner_availability")
            .insert({ owner_id: ownerId, weekday, time });
      if (error) throw error;
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
      if (!ownerId) throw new Error("Not signed in");
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("owner_availability")
        .delete()
        .eq("owner_id", ownerId);
      if (delErr) throw delErr;
      const rows = toAvailabilityRows(ownerId, next);
      if (rows.length) {
        const { error: insErr } = await supabase
          .from("owner_availability")
          .insert(rows);
        if (insErr) throw insErr;
      }
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
