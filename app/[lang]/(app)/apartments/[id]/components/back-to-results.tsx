"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import {
  SEARCH_MEMORY_KEY,
  cameFromResults,
  clearCameFromResults,
} from "@/app/[lang]/(app)/apartments/lib/search-memory";

/* "Back to results" that returns the user to the exact list they left.

   When the detail page was reached by clicking a listing card (fresh
   "came from results" marker), a plain click becomes history.back(): the
   router cache restores the list — filters, scroll and all — with no
   re-fetch and no skeleton flash.

   Otherwise (deep link, refresh, stale journey) it stays a normal link:
   bare /apartments on the server, upgraded to the remembered query once
   hydrated, so a click always lands somewhere sensible. */

const emptySubscribe = () => () => {};

function readRememberedQuery(): string | null {
  try {
    return sessionStorage.getItem(SEARCH_MEMORY_KEY);
  } catch {
    return null; // sessionStorage unavailable — fall back to bare /apartments
  }
}

export function BackToResults() {
  const t = useTranslations("detail");
  const router = useRouter();
  const qs = useSyncExternalStore(
    emptySubscribe,
    readRememberedQuery,
    () => null
  );
  const href = qs ? `/apartments?${qs}` : "/apartments";
  // Decided once at mount: the marker is only fresh right after a card click,
  // but the decision must hold however long the user stays on the page.
  const canGoBack = useRef(false);
  useEffect(() => {
    canGoBack.current = cameFromResults();
  }, []);
  return (
    <Link
      href={href}
      onClick={(e) => {
        // Leave modified clicks (new tab, etc.) to the browser.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!canGoBack.current) return;
        e.preventDefault();
        clearCameFromResults();
        router.back();
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-ring"
    >
      <ChevronLeft size={18} /> {t("backToResults")}
    </Link>
  );
}
