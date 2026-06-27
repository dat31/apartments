"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { authKeys } from "./keys";

/* Reactive current auth user, backed by react-query. The cache is kept fresh
   by the onAuthStateChange listener in <Providers>, so this query effectively
   never refetches on its own (staleTime: Infinity) — sign-in / sign-out push
   new data into the cache instead. */
export function useUser() {
  return useQuery<User | null>({
    queryKey: authKeys.user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    staleTime: Infinity,
  });
}
