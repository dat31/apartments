"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnreadCount } from "@/hooks/use-unread-count";

/* The nav "Messages" unread chip. A separate client component so the header
   stays exactly as statically prerenderable as it is today — it owns the hook
   the way SaveHomeButton owns useSaved, and the hook opens no websocket
   (see docs/plans/messaging-nav-badge.md).

   `variant` mirrors the two saved-count chips this sits beside: the desktop
   header swaps to primary-foreground-on-primary when active, the mobile
   drawer to secondary-foreground-on-secondary. */
export function MessagesUnreadBadge({
  active,
  variant = "header",
}: {
  active: boolean;
  variant?: "header" | "drawer";
}) {
  // Join the header's post-hydration reveal: server and first client render
  // show the signed-out shell, so the badge (client-only state) must not paint
  // until hydrated, or it reintroduces the mismatch the header guards against.
  const hydrated = useHydrated();
  const t = useTranslations("messaging");
  const total = useUnreadCount();

  if (!hydrated || total === 0) return null;

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
      {total > 99 ? "99+" : total}
      <span className="sr-only">{t("unreadBadge")}</span>
    </span>
  );
}
