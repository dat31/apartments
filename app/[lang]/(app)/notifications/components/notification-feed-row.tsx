"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  NOTIFICATION_ICONS,
  NOTIFICATION_SENTENCES,
} from "@/components/notifications/kind-meta";
import { notificationHref } from "@/lib/notifications/target";
import { type NotificationItem } from "@/schemas/notification";
import { NotificationTourActions } from "./notification-tour-actions";
import { X } from "lucide-react";

/* One row of the full feed.

   The popover's row (components/notifications/notification-item.tsx) says the
   same sentence — both read it from kind-meta — but this one has room the
   popover does not: a 40px subject, the timestamp on its own at the end of the
   line, and the decision the notification is about underneath it. That is the
   whole difference between the two surfaces, and the reason they are two
   components rather than one with a `dense` flag: a shared row with a mode
   switch on every second line is harder to read than either. */
export function NotificationFeedRow({
  notification,
  viewerId,
  now,
  onOpen,
  onDismiss,
}: {
  notification: NotificationItem;
  viewerId: string | undefined;
  /** The reference point for "8 minutes ago", pinned once by the feed so two
      rows in one render can't disagree about what "now" is. */
  now: Date;
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const Icon = NOTIFICATION_ICONS[notification.kind];
  const unread = !notification.read;

  const sentence = t.rich(NOTIFICATION_SENTENCES[notification.kind], {
    // Both subjects can be absent — an account that closed, a home that was
    // unpublished — and a sentence with a hole in it is worse than a generic
    // noun. Neither fallback is ever empty.
    name: notification.actor?.name?.trim() || t("someone"),
    listing: notification.listing?.title?.trim() || t("aHome"),
    rating: notification.data.rating ?? 0,
    strong: (chunks) => <span className="font-semibold">{chunks}</span>,
  });

  /* The slot, when the kind has one. Postgres hands back "HH:mm:ss" for a
     `time` column and the app works in "HH:mm" — the same trim tours-map does
     on the way out of the database. */
  const { date, time } = notification.data;
  const slot =
    date &&
    format.dateTime(new Date(`${date}T00:00:00`), {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + (time ? ` · ${time.slice(0, 5)}` : "");

  return (
    <article
      className={cn(
        "group relative flex gap-3.5 px-4 py-4 transition-colors sm:px-5",
        unread ? "bg-secondary/40 hover:bg-accent" : "hover:bg-muted/60"
      )}
    >
      {/* Stretched link: the row reads as one piece of news, so anything that
          isn't a button opens it. Same shape as the popover's row and
          ListingRow's. */}
      <Link
        href={notificationHref(notification, viewerId)}
        onClick={() => onOpen(notification.id)}
        className="absolute inset-0 z-10 focus-ring"
      >
        <span className="sr-only">{t("open")}</span>
      </Link>

      {notification.actor ? (
        <ProfileAvatar
          name={notification.actor.name}
          palette={notification.actor.palette}
          size={40}
        />
      ) : (
        /* No actor means nobody did this — a saved-search match is caused by
           the catalogue. An icon tile reads more honestly than initials, and
           an unread one carries the accent the avatar cannot. */
        <span
          className={cn(
            "inline-grid size-10 shrink-0 place-items-center",
            unread
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon size={18} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm leading-snug text-pretty",
                unread ? "font-medium" : "text-foreground/90"
              )}
            >
              {sentence}
            </p>
            {/* Only when there is a slot to show. The kind's icon rides along
                with it rather than standing on its own — a lone glyph under a
                sentence that already says what happened is noise, and on an
                actorless row the icon is the subject tile already. */}
            {slot && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon size={13} className="shrink-0" />
                <span>{slot}</span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <time
              dateTime={notification.createdAt}
              className="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
            >
              {format.relativeTime(new Date(notification.createdAt), now)}
            </time>
            {/* Unread marker. Decorative — the sentence is the same either
                way, and the count in the bell is the accessible signal. */}
            {unread && (
              <span className="size-2 shrink-0 bg-primary" aria-hidden="true" />
            )}
            <Button
              variant="ghost"
              size="icon"
              // z-20 to stay clickable through the stretched link above.
              className="relative z-20 size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t("dismiss")}
              onClick={() => onDismiss(notification.id)}
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        <NotificationTourActions
          notification={notification}
          onDone={() => onOpen(notification.id)}
        />
      </div>
    </article>
  );
}
