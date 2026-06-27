"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/link";
import { ChevronLeft } from "lucide-react";
import { SEARCH_MEMORY_KEY } from "@/app/[lang]/(app)/apartments/lib/search-memory";

/* "Back to results" that restores the filters/sort/page the user left the list
   with. Starts as bare /apartments (SSR-safe) and upgrades to the remembered
   query after mount, so a click always lands somewhere sensible. */
export function BackToResults() {
  const [href, setHref] = useState("/apartments");
  useEffect(() => {
    try {
      const qs = sessionStorage.getItem(SEARCH_MEMORY_KEY);
      if (qs) setHref(`/apartments?${qs}`);
    } catch {
      // ignore — fall back to bare /apartments
    }
  }, []);
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
    >
      <ChevronLeft size={18} /> Back to results
    </Link>
  );
}
