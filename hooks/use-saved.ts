"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";

/* Persisted shortlist of saved listing ids.

   Signed-in users: rows in the Supabase `saved_listings` table, read/written
   through react-query with an optimistic toggle so the Heart flips instantly.
   Guests: a localStorage shortlist (same as before) that is merged into the
   DB the first time they sign in, so nothing they saved logged-out is lost.

   The public API ({ saved, isSaved, toggleSave, ready }) is unchanged, so the
   card / booking / saved-page consumers didn't need to change. */

const GUEST_KEY = "danapa-saved";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Query keys shared by the saved hook (and available to invalidate elsewhere).
   Keyed per user so a sign-in / sign-out swaps to a separate cache entry. */
export const savedKeys = {
  all: ["saved"] as const,
  list: (userId: string | undefined) => ["saved", userId ?? "guest"] as const,
};

function readGuest(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeGuest(ids: string[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
  } catch {}
}

export function useSaved() {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: savedKeys.list(userId),
    // Hold off until auth resolves so we don't fetch a guest list and then
    // immediately swap to the user list on the same mount.
    enabled: !userPending,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return readGuest();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((r) => r.listing_id);
    },
  });

  const saved = useMemo(() => query.data ?? [], [query.data]);

  const mutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      if (!userId) {
        const current = readGuest();
        writeGuest(
          next
            ? [id, ...current.filter((x) => x !== id)]
            : current.filter((x) => x !== id)
        );
        return;
      }
      const supabase = createClient();
      if (next) {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ profile_id: userId, listing_id: id });
        // 23505 = already saved (unique_violation) — treat as success.
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("profile_id", userId)
          .eq("listing_id", id);
        if (error) throw error;
      }
    },
    // Flip the Heart immediately, roll back if the write fails.
    onMutate: async ({ id, next }) => {
      const key = savedKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(
        key,
        next
          ? [id, ...previous.filter((x) => x !== id)]
          : previous.filter((x) => x !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(savedKeys.list(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.list(userId) });
    },
  });

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const toggleSave = useCallback(
    (id: string) => mutation.mutate({ id, next: !saved.includes(id) }),
    [mutation, saved]
  );

  // One-time merge of a guest's localStorage shortlist into the DB on sign-in.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!userId || migratedRef.current) return;
    migratedRef.current = true;

    // Only migrate real listing uuids — drop any legacy seed ids ("l1", …)
    // that would fail the listing_id foreign key.
    const guestIds = readGuest().filter((id) => UUID_RE.test(id));
    if (guestIds.length === 0) {
      writeGuest([]);
      return;
    }

    const supabase = createClient();
    supabase
      .from("saved_listings")
      .upsert(
        guestIds.map((listing_id) => ({ profile_id: userId, listing_id })),
        { onConflict: "profile_id,listing_id", ignoreDuplicates: true }
      )
      .then(({ error }) => {
        if (error) return; // keep the guest list so nothing is silently lost
        writeGuest([]);
        queryClient.invalidateQueries({ queryKey: savedKeys.list(userId) });
      });
  }, [userId, queryClient]);

  return {
    saved,
    toggleSave,
    isSaved,
    ready: !userPending && !query.isLoading,
  };
}
