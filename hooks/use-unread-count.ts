"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/auth";

/* Unread-message total for the nav "Messages" badge.

   One source of truth — this react-query cache entry. The badge reads it and
   populates it over HTTP (GET /api/stream/unread) when stale; pages that
   already hold a Stream socket write into the same key from live events
   (MessagingProvider's bridge), so on those pages the count updates instantly
   with no fetch. Never opens a socket itself — see docs/plans/messaging-nav-badge.md. */

export const unreadKeys = {
  total: (userId: string | undefined) =>
    ["stream", "unread-total", userId ?? "guest"] as const,
};

export function useUnreadCount(): number {
  const { data: user } = useUser();

  const query = useQuery({
    // Keyed per user so a sign-out or account switch can never surface the
    // previous person's count; disabled entirely when signed out.
    queryKey: unreadKeys.total(user?.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    // Per-query override: the app's QueryClient default is
    // refetchOnWindowFocus: false (components/providers.tsx). Without this a
    // user who tabs away, receives a message, and tabs back would see a stale
    // badge until their next navigation.
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: async (): Promise<number> => {
      const res = await fetch("/api/stream/unread", { cache: "no-store" });
      if (!res.ok) throw new Error(`unread count failed: ${res.status}`);
      const data = (await res.json()) as { total?: number };
      return data.total ?? 0;
    },
  });

  // A badge is decoration; it must never render an error or loading state, so
  // anything but a real number resolves to 0 (hidden).
  return query.data ?? 0;
}
