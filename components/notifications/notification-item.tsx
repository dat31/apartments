"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { notificationHref } from "@/lib/notifications/target";
import { type NotificationItem as Item } from "@/schemas/notification";
import { NOTIFICATION_ICONS, NOTIFICATION_SENTENCES } from "./kind-meta";
import { X } from "lucide-react";

/* One row of the bell popover's quick view.

   The sentence is assembled here rather than stored: the row holds a `kind`
   and some ids, so the same notification reads in Vietnamese or English
   depending only on who is looking. That is the reason `data` on the row is
   limited to values with no translation — a date, a time, a rating.

   The icon and the message key come from ./kind-meta, which the page's row
   reads too: the two surfaces lay a notification out differently, but they
   must never word it differently. */

export function NotificationRow({
  notification,
  viewerId,
  now,
  onOpen,
  onDismiss,
}: {
  notification: Item;
  viewerId: string | undefined;
  /** The reference point for "8 minutes ago", pinned by the list. Passed in
      rather than read per row: left to itself `relativeTime` calls Date.now()
      on every invocation, which raises next-intl's ENVIRONMENT_FALLBACK and
      lets two rows in one render disagree about what "now" is. */
  now: Date;
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const Icon = NOTIFICATION_ICONS[notification.kind];

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
     `time` column and the app works in "HH:mm" — the same trim tours-map
     does on the way out of the database. */
  const { date, time } = notification.data;
  const slot =
    date &&
    format.dateTime(new Date(`${date}T00:00:00`), {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + (time ? ` · ${time.slice(0, 5)}` : "");

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-accent",
        !notification.read && "bg-secondary/40"
      )}
    >
      {/* Stretched link: the row reads as one piece of news, so anything that
          isn't the dismiss button opens it. Same shape as ListingRow. */}
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
          size={36}
        />
      ) : (
        /* No actor means nobody did this — a saved-search match is caused by
           the catalogue. An icon tile reads more honestly than initials. */
        <span className="inline-grid place-items-center size-9 shrink-0 bg-muted text-muted-foreground">
          <Icon size={17} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{sentence}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {notification.actor && <Icon size={13} className="shrink-0" />}
          {slot && <span>{slot}</span>}
          {slot && <span aria-hidden="true">·</span>}
          <time dateTime={notification.createdAt}>
            {format.relativeTime(new Date(notification.createdAt), now)}
          </time>
        </p>
      </div>

      {/* Unread marker. Decorative — the sentence is the same either way, and
          the count in the bell is the accessible signal. */}
      {!notification.read && (
        <span
          className="mt-1.5 size-2 shrink-0 bg-primary"
          aria-hidden="true"
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        // z-20 to stay clickable through the stretched link above.
        className="relative z-20 size-7 shrink-0 self-start text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={t("dismiss")}
        onClick={() => onDismiss(notification.id)}
      >
        <X size={15} />
      </Button>
    </div>
  );
}
