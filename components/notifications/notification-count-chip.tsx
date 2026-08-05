"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNotificationCount } from "@/hooks/use-notifications";

/* The unread count as a bare chip, for a nav row that already has its own
   icon and label — the drawer's "Notifications" entry.

   Split from NotificationBell rather than given a variant: the bell owns a
   popover and a trigger button, and none of that belongs inside a link. What
   the two share is the count hook, which is where the single source of truth
   actually lives.

   Classes are the saved-count chip's, including the active-variant swap, so
   every count in the nav reads as the same object. */
export function NotificationCountChip({
  active,
  variant = "header",
}: {
  active: boolean;
  variant?: "header" | "drawer";
}) {
  const hydrated = useHydrated();
  const t = useTranslations("notifications");
  const count = useNotificationCount();

  if (!hydrated || count === 0) return null;

  const activeClasses =
    variant === "drawer"
      ? "bg-secondary-foreground text-secondary"
      : "bg-primary-foreground text-primary";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold tabular-nums",
        active ? activeClasses : "bg-primary text-primary-foreground"
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only">{t("unreadBadge")}</span>
    </span>
  );
}
