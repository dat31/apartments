"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/* Another user's display name, by profile uuid. `profiles` is anon-readable
   (RLS `profiles_select_public`), so this works signed-out too.

   Server components should call getOwnerProfile from @/lib/services/owners
   instead; this exists for the client-only spots that only have an owner id
   in hand (e.g. the renter's calendar export). Names change rarely, so the
   result is cached for the session. */
export function useOwnerName(ownerId: string | undefined) {
  const query = useQuery({
    queryKey: ["owner-name", ownerId ?? "none"],
    enabled: !!ownerId,
    staleTime: Infinity,
    queryFn: async (): Promise<string> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return data?.name ?? "";
    },
  });

  return query.data ?? "";
}
