"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMySavedIds,
  mergeGuestSavedAction,
  setSavedAction,
} from "@/lib/actions/saved-listings";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  savedListingsKeys,
  type SavedFacets,
  type SavedListingsPage,
} from "@/hooks/saved-listings-keys";

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
  const hydrated = useHydrated();

  const query = useQuery({
    queryKey: savedKeys.list(userId),
    // Hold off until auth resolves so we don't fetch a guest list and then
    // immediately swap to the user list on the same mount.
    enabled: !userPending,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return readGuest();
      return unwrap(await fetchMySavedIds());
    },
  });

  /* Empty until hydration, whatever the cache already holds. The shortlist is
     client-only (localStorage / an authed fetch), so the server always streams
     the unsaved state — but consumers sit inside Suspense boundaries that
     hydrate *after* the header's useSaved() has filled the shared query cache.
     Without this gate those boundaries hydrate against a populated list and
     React reports a mismatch on the Heart's label and colours. */
  const saved = useMemo(
    () => (hydrated ? (query.data ?? []) : []),
    [hydrated, query.data]
  );

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
      // Idempotent in both directions — see setSaved in the service.
      unwrap(await setSavedAction(id, next));
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

      if (!next) {
        // Removal: patch the Saved page's cached data in place — drop the card
        // from any cached page it appears on and decrement the totals. The new
        // shortlist re-keys those queries (the ids are part of the key), and
        // keepPreviousData falls back to these entries while the new key loads,
        // so the card disappears instantly — no flash, no layout shift.
        queryClient.setQueriesData<SavedListingsPage>(
          { queryKey: savedListingsKeys.pages },
          (old) =>
            old && old.listings.some((l) => l.id === id)
              ? {
                  listings: old.listings.filter((l) => l.id !== id),
                  total: Math.max(0, old.total - 1),
                }
              : old
        );
        queryClient.setQueriesData<SavedFacets>(
          { queryKey: savedListingsKeys.facetsAll },
          (old) => (old ? { ...old, total: Math.max(0, old.total - 1) } : old)
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(savedKeys.list(userId), context.previous);
      }
      // The optimistic patches above may have run; resync from the server.
      queryClient.invalidateQueries({ queryKey: savedListingsKeys.pages });
      queryClient.invalidateQueries({ queryKey: savedListingsKeys.facetsAll });
    },
    onSuccess: () => {
      // The new shortlist already re-keys the saved-listings queries, so the
      // visible one is fetching on its own. What still needs handling is the
      // entries we patched above: they're now inactive (keyed by the *old*
      // shortlist) and hold hand-edited data, so mark them — and every other
      // cached combination — invalidated. Toggling back re-keys onto one of
      // them, and it refetches instead of serving the patched copy. No refetch
      // here (refetchType "none") so we don't cancel and restart the fetch the
      // re-key just started.
      const refetchType = "none" as const;
      queryClient.invalidateQueries({
        queryKey: savedListingsKeys.pages,
        refetchType,
      });
      queryClient.invalidateQueries({
        queryKey: savedListingsKeys.facetsAll,
        refetchType,
      });
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

    void mergeGuestSavedAction(guestIds).then((result) => {
      if (!result.ok) return; // keep the guest list so nothing is silently lost
      writeGuest([]);
      queryClient.invalidateQueries({ queryKey: savedKeys.list(userId) });
    });
  }, [userId, queryClient]);

  return {
    saved,
    toggleSave,
    isSaved,
    ready: hydrated && !userPending && !query.isLoading,
    // Cache scope for the saved-listings queries (per user, "guest" when anon).
    scope: userId ?? "guest",
  };
}
