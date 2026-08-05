"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  fetchNotificationPreferences,
  updateNotificationPreferenceAction,
} from "@/lib/actions/notifications";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { notificationKeys } from "@/hooks/use-notifications";
import {
  type NotificationCategory,
  type NotificationPreferences,
} from "@/schemas/notification";

/* The category switches behind the settings dialog.

   Its own cache entry rather than a field on the feed: the dialog is opened by
   a minority of people and the preferences change far less often than the feed
   does, so the two want different staleness. They are not independent, though
   — muting a category removes rows from the feed and from the badge, which is
   decided server-side — so every successful flip invalidates the whole
   notifications key rather than only this one.

   Optimistic, unlike the feed's mutations only in what it rolls back to: a
   switch that waits for a round trip before moving reads as broken, and the
   failure path here is a toast plus the switch springing back. */

/** All-on, matching NOTIFICATION_PREFERENCE_DEFAULTS in the service. What the
    dialog renders before the query lands, so nothing shows as off until the
    server has actually said so. */
const OPTIMISTIC_DEFAULTS: NotificationPreferences = {
  tours: true,
  matches: true,
  activity: true,
};

/* Its own root, deliberately outside notificationKeys: every mark-read and
   dismiss invalidates that prefix, and preferences do not change when a row
   is read. */
export const notificationPreferenceKeys = {
  mine: (userId: string | undefined) =>
    ["notification-preferences", userId ?? "guest"] as const,
};

export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const t = useTranslations("notifications.settings");
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const key = notificationPreferenceKeys.mine(userId);

  const query = useQuery({
    queryKey: key,
    enabled: !userPending && !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<NotificationPreferences> =>
      unwrap(await fetchNotificationPreferences()),
  });

  const mutation = useMutation({
    /* Serialized: two quick flips of different switches both read the current
       preferences server-side before writing, so overlapping them would let
       the second overwrite the first with the state it read before it. */
    scope: { id: "notification-preferences" },
    mutationFn: async ({
      category,
      enabled,
    }: {
      category: NotificationCategory;
      enabled: boolean;
    }) => {
      unwrap(await updateNotificationPreferenceAction(category, enabled));
    },
    onMutate: async ({ category, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      queryClient.setQueryData<NotificationPreferences>(key, {
        ...(previous ?? OPTIMISTIC_DEFAULTS),
        [category]: enabled,
      });
      return previous;
    },
    onError: (_error, _variables, previous) => {
      queryClient.setQueryData(key, previous);
      toast.error(t("saveFailed"));
    },
    onSettled: () => {
      /* The feed and the badge are filtered by these on the server, so both
         have to be re-read — not just this entry. notificationKeys.all is the
         prefix of all three. */
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const setCategory = useCallback(
    (category: NotificationCategory, enabled: boolean) =>
      mutation.mutate({ category, enabled }),
    [mutation]
  );

  return {
    preferences: query.data ?? OPTIMISTIC_DEFAULTS,
    setCategory,
    ready: !userPending && !query.isLoading,
  };
}
