"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/* Shared URL helpers for the client filter/sort/pagination islands.
   Writing to the URL is the only way these components change state. */
export function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (patch: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Any filter/sort change invalidates the current page unless told otherwise.
      if (opts?.resetPage !== false) params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const reset = useCallback(
    () => router.push(pathname, { scroll: false }),
    [router, pathname]
  );

  return { searchParams, setParams, reset };
}
