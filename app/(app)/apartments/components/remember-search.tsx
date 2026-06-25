"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SEARCH_MEMORY_KEY } from "../lib/search-memory";

/* Records the current listing query (filters/sort/page) so the detail page can
   send the user back to the same list. Renders nothing. */
export function RememberSearch() {
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      sessionStorage.setItem(SEARCH_MEMORY_KEY, searchParams.toString());
    } catch {
      // sessionStorage may be unavailable (private mode / SSR) — non-critical.
    }
  }, [searchParams]);
  return null;
}
