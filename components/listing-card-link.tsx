"use client";

import { type ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { markCameFromResults } from "@/app/[lang]/(app)/apartments/lib/search-memory";

/* The listing card's stretched link. When clicked on the /apartments results
   list (cards also appear on the landing, saved and owner pages), it stamps a
   "came from results" marker so the detail page's "Back to results" can do a
   real history.back() — an instant restore of that exact list, filters and
   scroll intact. From any other page the marker stays unset and "Back to
   results" falls back to pushing /apartments with the remembered query. */
export function ListingCardLink(props: ComponentProps<typeof Link>) {
  // Locale-less pathname: "/apartments" whatever the locale prefix or query.
  const pathname = usePathname();
  return (
    <Link
      {...props}
      onClick={() => {
        if (pathname === "/apartments") markCameFromResults();
      }}
    />
  );
}
