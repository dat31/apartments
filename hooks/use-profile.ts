"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyProfile, saveMyProfile } from "@/lib/actions/profiles";
import { unwrap } from "@/lib/actions/result";
import { authKeys, useUser } from "@/hooks/auth";
import { type Profile, DEFAULT_PROFILE } from "@/schemas/profile";

/* The signed-in user's profile, sourced from the Supabase `profiles` table and
   merged with the auth email. Backed by react-query and keyed on the user id,
   so it refreshes automatically when the auth state changes (the listener in
   <Providers> invalidates the "profile" key on sign-in / sign-out).

   When no user is signed in it resolves to DEFAULT_PROFILE and writes become a
   no-op — there's no row to update. */
export function useProfile() {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [...authKeys.profile, userId],
    enabled: !!userId,
    // The row, the auth email and the signup-metadata fallback are merged
    // server-side — see getMyProfile in @/lib/services/profiles.
    queryFn: async (): Promise<Profile> => unwrap(await fetchMyProfile()),
  });

  const profile: Profile =
    query.data ?? { ...DEFAULT_PROFILE, email: user?.email ?? "" };

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!userId) return;
      unwrap(await saveMyProfile(patch));
    },
    // Optimistic update so profile edits feel instant.
    onMutate: async (patch) => {
      if (!userId) return;
      const key = [...authKeys.profile, userId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData([...authKeys.profile, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
    },
  });

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      if (!userId) return;
      updateMutation.mutate(patch);
    },
    [userId, updateMutation]
  );

  return {
    profile,
    updateProfile,
    ready: !userPending && !query.isLoading,
  };
}
