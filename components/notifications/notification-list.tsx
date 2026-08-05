"use client";

import { useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationRow } from "./notification-item";
import { SkeletonNotifications } from "./skeleton-notification";
import { BellOff } from "lucide-react";

/* The feed itself, shared by the bell popover and the /notifications page.

   One component for both so the two can't drift into different sentences for
   the same row. The only difference between the surfaces is how much they
   ask for and whether they offer a way out to the full page. */
export function NotificationList({
  limit,
  showSeeAll = false,
  onNavigate,
}: {
  limit?: number;
  /** The popover's footer link. The page has nowhere further to go. */
  showSeeAll?: boolean;
  /** Lets the popover close itself when a row is opened. */
  onNavigate?: () => void;
}) {
  const t = useTranslations("notifications");
  /* One reference point for every row, ticked once a minute.

     A global `now` in i18n/request.ts would be the other way to satisfy
     relativeTime, but it is wrong here: the (app) layout is statically
     prerendered per locale, so that value would be frozen at build time and
     every age in the feed would be measured from the deploy. Pinning on the
     client is both correct and what makes "8 minutes ago" become "9 minutes
     ago" without a reload — a feed that lies about its own freshness is worse
     than one that re-renders. */
  const now = useNow({ updateInterval: 60_000 });
  const { data: user } = useUser();
  const { items, markRead, markAllRead, dismiss, ready } =
    useNotifications(limit);
  const hasUnread = items.some((n) => !n.read);

  if (!ready) return <SkeletonNotifications count={limit && limit < 6 ? limit : 4} />;

  if (!items.length) {
    return (
      <div className="px-6 py-10 text-center">
        <BellOff
          size={26}
          className="mx-auto text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-semibold">{t("emptyTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end px-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAllRead}
          >
            {t("markAllRead")}
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border">
        {items.map((notification) => (
          <li key={notification.id}>
            <NotificationRow
              notification={notification}
              viewerId={user?.id}
              now={now}
              onOpen={(id) => {
                markRead(id);
                onNavigate?.();
              }}
              onDismiss={dismiss}
            />
          </li>
        ))}
      </ul>

      {showSeeAll && (
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <Link href="/notifications" onClick={onNavigate}>
              {t("seeAll")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
