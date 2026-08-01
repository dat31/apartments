"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProfileName } from "@/lib/actions/profiles";
import { unwrap } from "@/lib/actions/result";

/* Another user's display name, by profile uuid. `profiles` is anon-readable
   (RLS `profiles_select_public`), so this works signed-out too.

   Server components should call getOwnerProfile from @/lib/services/owners
   instead; this exists for the client-only spots that only have an owner id
   in hand (e.g. the renter's calendar export). Names change rarely, so the
   result is cached for the session on the client and on the server too — the
   action reads through an owner:<id>-tagged cache. */
export function useOwnerName(ownerId: string | undefined) {
  const query = useQuery({
    queryKey: ["owner-name", ownerId ?? "none"],
    enabled: !!ownerId,
    staleTime: Infinity,
    queryFn: async (): Promise<string> => unwrap(await fetchProfileName(ownerId!)),
  });

  return query.data ?? "";
}
