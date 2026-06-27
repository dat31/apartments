"use client";

import * as React from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authKeys } from "@/hooks/auth";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/* One QueryClient per browser tab; a fresh one per request on the server. */
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener>{children}</AuthListener>
    </QueryClientProvider>
  );
}

/* Bridges Supabase auth into react-query: every auth change writes the current
   user into the cache so useUser() stays reactive, and on actual sign-in /
   sign-out it refreshes Server Components (which re-read the session cookie). */
function AuthListener({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const previousUserId = React.useRef<string | null | undefined>(undefined);

  React.useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      queryClient.setQueryData(authKeys.user, user);

      const userId = user?.id ?? null;
      // Skip the initial event (server already rendered this session) and pure
      // token refreshes (same user) — only react to a real identity change.
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClient.invalidateQueries({ queryKey: authKeys.profile });
        router.refresh();
      }
      previousUserId.current = userId;
    });

    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  return <>{children}</>;
}
