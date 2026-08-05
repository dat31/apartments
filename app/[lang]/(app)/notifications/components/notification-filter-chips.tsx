"use client";

import { useTranslations } from "next-intl";
import { Chip } from "@/components/chip";
import { Link } from "@/i18n/navigation";
import { FEED_FILTERS, type FeedFilter } from "../lib/feed";

/* The filter row above the feed.

   Real links, not buttons: the filter lives in the URL (`?show=tours`), so a
   filtered feed can be reloaded, shared and walked back through with the
   browser's own back button — the same rule browse follows for its facets.
   "All" clears the parameter rather than setting `show=all`, so the canonical
   URL of the page stays /notifications.

   A category with nothing in it is hidden rather than shown empty; "All" and
   "Unread" always render, because their zero states are meaningful. */
export function NotificationFilterChips({
  active,
  counts,
}: {
  active: FeedFilter;
  counts: Record<FeedFilter, number>;
}) {
  const t = useTranslations("notifications.filters");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5">
      {FEED_FILTERS.map((filter) => {
        const count = counts[filter] ?? 0;
        if (!count && filter !== "all" && filter !== "unread") return null;

        return (
          <Chip key={filter} active={filter === active} asChild>
            <Link
              href={
                filter === "all"
                  ? "/notifications"
                  : { pathname: "/notifications", query: { show: filter } }
              }
              scroll={false}
              aria-current={filter === active ? "true" : undefined}
            >
              {t(filter)}
              <span className="tabular-nums opacity-75">{count}</span>
            </Link>
          </Chip>
        );
      })}
    </div>
  );
}
