"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  dismissNotificationAction,
  fetchMyNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  restoreNotificationAction,
} from "@/lib/actions/notifications";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type NotificationItem } from "@/schemas/notification";

/* The notification feed and its badge count.

   Two cache entries, not one. The bell renders on every page and needs a
   number; the list is only ever mounted inside an open popover or the
   /notifications page. Keeping them apart means browsing costs one small
   count query and never the feed itself.

   Both are keyed on the user id so a sign-out or account switch can never
   surface the previous person's news, and every mutation invalidates both —
   reading an item has to move the badge. */

export const notificationKeys = {
  all: ["notifications"] as const,
  count: (userId: string | undefined) =>
    ["notifications", "count", userId ?? "guest"] as const,
  list: (userId: string | undefined) =>
    ["notifications", "list", userId ?? "guest"] as const,
};

/** The unread count behind the nav bell. */
export function useNotificationCount(): number {
  const { data: user } = useUser();

  const query = useQuery({
    queryKey: notificationKeys.count(user?.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    /* Per-query override: the app's QueryClient default is
       refetchOnWindowFocus: false (components/providers.tsx). Without this a
       user who tabs away, has a tour confirmed, and tabs back would see a
       stale badge until their next navigation. Same reasoning, and the same
       override, as useUnreadCount. */
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: async (): Promise<number> =>
      unwrap(await fetchUnreadNotificationCount()),
  });

  // A badge is decoration; it must never render an error or loading state.
  return query.data ?? 0;
}

/* One toast per notification, so dismissing three in a row leaves three undos
   rather than one that only remembers the last. Keyed by id, so re-dismissing
   the same row replaces its toast instead of stacking a duplicate. */
const dismissToast = (id: string) => `notification-dismiss:${id}`;

/** The feed, with optimistic mark-read / mark-all / dismiss, and undo. */
export function useNotifications(limit?: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("notifications");
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: notificationKeys.list(userId),
    enabled: !userPending,
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!userId) return [];
      return unwrap(await fetchMyNotifications(limit));
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  /* Optimistically apply a change to the cached list *and* the count, so the
     badge and the row move together. Returning the previous value of both is
     what lets onError put them back. */
  const snapshot = useCallback(() => {
    const listKey = notificationKeys.list(userId);
    const countKey = notificationKeys.count(userId);
    return {
      list: queryClient.getQueryData<NotificationItem[]>(listKey),
      count: queryClient.getQueryData<number>(countKey),
    };
  }, [queryClient, userId]);

  const restore = useCallback(
    (previous: ReturnType<typeof snapshot>) => {
      queryClient.setQueryData(notificationKeys.list(userId), previous.list);
      queryClient.setQueryData(notificationKeys.count(userId), previous.count);
    },
    [queryClient, userId]
  );

  const write = useCallback(
    (next: NotificationItem[]) => {
      queryClient.setQueryData(notificationKeys.list(userId), next);
      queryClient.setQueryData(
        notificationKeys.count(userId),
        next.filter((n) => !n.read).length
      );
    },
    [queryClient, userId]
  );

  const mutation = useMutation({
    /* Serializes every notification mutation. Without it, an undo clicked
       while its own dismiss is still in flight can reach Postgres first and be
       overwritten by the dismiss landing after it — the row would stay gone
       while the UI showed it back. */
    scope: { id: "notifications" },
    mutationFn: async ({
      intent,
      id,
    }: {
      intent: "read" | "read-all" | "dismiss" | "restore";
      id?: string;
      /** The dismissed row, carried so undo can put it back without waiting
          for a refetch. Only ever set on "restore". */
      item?: NotificationItem;
    }) => {
      if (intent === "read-all") {
        unwrap(await markAllNotificationsReadAction());
      } else if (intent === "dismiss") {
        unwrap(await dismissNotificationAction(id!));
      } else if (intent === "restore") {
        unwrap(await restoreNotificationAction(id!));
      } else {
        unwrap(await markNotificationReadAction(id!));
      }
    },
    onMutate: async ({ intent, id, item }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = snapshot();
      const current = previous.list ?? [];

      write(
        intent === "read-all"
          ? current.map((n) => ({ ...n, read: true }))
          : intent === "dismiss"
            ? current.filter((n) => n.id !== id)
            : intent === "restore"
              ? /* Back in date order rather than on top: the feed is sorted by
                   when the news happened, and an undone dismissal is not news.
                   Filtered first so a restore racing a refetch that already
                   returned the row cannot duplicate it. */
                [...current.filter((n) => n.id !== item!.id), item!].sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
              : current.map((n) => (n.id === id ? { ...n, read: true } : n))
      );

      return previous;
    },
    onError: (_error, { intent, id }, previous) => {
      if (previous) restore(previous);
      /* Replaces the undo toast rather than adding a second one — same id.
         That matters beyond tidiness: leaving a live "Undo" over a dismissal
         that never happened invites a click that would restore a row which
         never left. */
      if (id && (intent === "dismiss" || intent === "restore")) {
        toast.error(t("dismissFailed"), { id: dismissToast(id) });
      }
    },
    onSettled: () => {
      // Both entries: the count is derived from the list optimistically, but
      // the server is the one that decides what it really is.
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markRead = useCallback(
    (id: string) => {
      // Already-read is a no-op rather than a wasted round trip — clicking a
      // read item to open it is the common case.
      if (items.find((n) => n.id === id)?.read) return;
      mutation.mutate({ intent: "read", id });
    },
    [items, mutation]
  );

  const markAllRead = useCallback(() => {
    if (!items.some((n) => !n.read)) return;
    mutation.mutate({ intent: "read-all" });
  }, [items, mutation]);

  /* Dismiss, and offer the way back.

     The toast is raised here rather than in NotificationList for the same
     reason the list component is shared by the bell and the page: this is the
     only place that holds the row being removed, and one implementation is one
     that cannot drift between the two surfaces. The Toaster is mounted in the
     root layout, so the undo outlives the popover closing behind it. */
  const dismiss = useCallback(
    (id: string) => {
      const item = items.find((n) => n.id === id);
      if (!item) return;

      mutation.mutate({ intent: "dismiss", id });
      toast.success(t("dismissed"), {
        id: dismissToast(id),
        action: {
          label: t("undo"),
          onClick: () => mutation.mutate({ intent: "restore", id, item }),
        },
      });
    },
    [items, mutation, t]
  );

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    markRead,
    markAllRead,
    dismiss,
    ready: !userPending && !query.isLoading,
  };
}
