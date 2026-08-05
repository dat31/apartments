"use client";

import * as React from "react";
import { useNow, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { SkeletonNotifications } from "@/components/notifications/skeleton-notification";
import { Link } from "@/i18n/navigation";
import {
  countByFilter,
  filterNotifications,
  groupByDay,
  parseFeedFilter,
} from "../lib/feed";
import { NotificationFeedRow } from "./notification-feed-row";
import { NotificationFilterChips } from "./notification-filter-chips";
import { NotificationSettingsDialog } from "./notification-settings-dialog";
import { BellOff, Check, CheckCheck, Search } from "lucide-react";

/* The full feed: everything the bell's quick view leaves out.

   The popover shows the newest few and gets out of the way; this shows the
   whole history, split by day, filterable by category, with the one decision
   each row is about attached to it. Both read the same react-query entry, so
   opening this page after reading something in the bell shows that state
   rather than re-fetching into a different one.

   A client island rather than a server list, and deliberately so: the feed is
   per-user, mutable from three surfaces, and every row here can change what
   the badge in the header says. Nothing about it is cacheable, and the page
   frame around it stays a static shell that prerenders per locale. */
export function NotificationFeed() {
  const t = useTranslations("notifications");
  /* One reference point for every row, ticked once a minute. Pinned on the
     client because the (app) layout is statically prerendered per locale — a
     `now` from i18n/request.ts would be frozen at build time and every age in
     the feed would be measured from the deploy. */
  const now = useNow({ updateInterval: 60_000 });
  const { data: user } = useUser();
  const { items, markRead, markAllRead, dismiss, ready } = useNotifications();

  const searchParams = useSearchParams();
  const filter = parseFeedFilter(searchParams.get("show"));

  const counts = React.useMemo(() => countByFilter(items), [items]);
  const shown = React.useMemo(
    () => filterNotifications(items, filter),
    [items, filter]
  );
  const sections = React.useMemo(() => groupByDay(shown, now), [shown, now]);
  const unread = counts.unread;

  return (
    <>
      {/* The live half of the header. The title and its standing subtitle are
          server-rendered above; what changes with the data — the tally and the
          two things you can do to the whole feed — belongs here. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {!ready
            ? null
            : items.length === 0
              ? t("summaryEmpty")
              : unread > 0
                ? t.rich("summary", {
                    unread,
                    total: items.length,
                    strong: (chunks) => (
                      <span className="font-medium text-foreground tabular-nums">
                        {chunks}
                      </span>
                    ),
                  })
                : t("summaryCaughtUp", { total: items.length })}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            <CheckCheck size={15} /> {t("markAllRead")}
          </Button>
          {/* Renders its own trigger, and owns its own open state — nothing
              here re-renders when settings open. */}
          <NotificationSettingsDialog />
        </div>
      </div>

      {ready && items.length > 0 && (
        <NotificationFilterChips active={filter} counts={counts} />
      )}

      {!ready ? (
        <div className="bg-card">
          <SkeletonNotifications count={5} />
        </div>
      ) : items.length === 0 ? (
        /* Nothing has ever arrived. Says what would make something arrive,
           rather than only that the feed is empty. */
        <div className="bg-card p-12 text-center sm:p-16">
          <span
            aria-hidden="true"
            className="mb-5 inline-grid size-16 place-items-center bg-secondary text-muted-foreground"
          >
            <BellOff size={28} />
          </span>
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            {t("emptyBody")}
          </p>
          <Button asChild className="mt-6">
            <Link href="/apartments">
              <Search size={16} /> {t("browseHomes")}
            </Link>
          </Button>
        </div>
      ) : shown.length === 0 ? (
        /* The feed has news, this filter doesn't. A different sentence, and a
           way back, rather than the empty state above. */
        <div className="bg-card p-12 text-center">
          <span
            aria-hidden="true"
            className="mb-4 inline-grid size-14 place-items-center bg-secondary text-primary"
          >
            <Check size={24} />
          </span>
          <h2 className="text-lg font-semibold">
            {filter === "unread" ? t("caughtUpTitle") : t("noneInFilterTitle")}
          </h2>
          <p className="mt-1.5 text-pretty text-muted-foreground">
            {filter === "unread" ? t("caughtUpBody") : t("noneInFilterBody")}
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-5">
            <Link href="/notifications" scroll={false}>
              {t("filters.showAll")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section, index) => (
            <section
              // The bucket can repeat if the feed is not perfectly sorted, so
              // the index is part of the key rather than the bucket alone.
              key={`${section.bucket}-${index}`}
              aria-label={t(`days.${section.bucket}`)}
            >
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {t(`days.${section.bucket}`)}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {section.items.length}
                </span>
              </div>
              <ul className="divide-y divide-border bg-card">
                {section.items.map((notification) => (
                  <li key={notification.id}>
                    <NotificationFeedRow
                      notification={notification}
                      viewerId={user?.id}
                      now={now}
                      onOpen={markRead}
                      onDismiss={dismiss}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

    </>
  );
}
