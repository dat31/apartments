"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNotificationCount } from "@/hooks/use-notifications";
import { NotificationCountChip } from "./notification-count-chip";
import { NotificationList } from "./notification-list";
import { Bell } from "lucide-react";

/* The nav bell and its unread chip.

   A separate client component for the same reason MessagesUnreadBadge is one:
   the header must stay statically prerenderable, so the count lives behind a
   hook here rather than being read on the server in site-header. It also
   means the feed itself is only ever fetched once someone opens the popover —
   browsing costs the count query and nothing else.

   One bell serves both roles. A renter and an owner get different *kinds*, but
   splitting the surface would fragment the read state and leave an account
   that does both with two places to check. */

/** How many the popover shows. The rest are a click away on /notifications. */
const PREVIEW_COUNT = 8;

export function NotificationBell() {
  const t = useTranslations("notifications");
  // Join the header's post-hydration reveal — server and first client render
  // show the signed-out shell, so anything derived from the session must wait
  // or it reintroduces the mismatch the header guards against.
  const hydrated = useHydrated();
  const count = useNotificationCount();
  const [open, setOpen] = React.useState(false);

  if (!hydrated) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* h-9 gap-1.5 px-3, the same button shape Messages and Saved use, so
            the count sits *beside* the icon rather than overlapping its
            corner. The chip is the shared one; `active` is `open` here because
            that is when the trigger turns primary and the chip has to invert
            with it, exactly as the others do on their own page. */}
        <Button
          variant={open ? "default" : "ghost"}
          size="default"
          className="h-9 gap-1.5 px-3"
          aria-label={t("bellAria", { count })}
        >
          <Bell size={19} />
          <NotificationCountChip active={open} />
        </Button>
      </PopoverTrigger>

      {/* w-100 rather than something narrower: the meta line is the widest
          thing in a row, and in Vietnamese its worst case — a full slot plus
          the longest relative time, "Thứ 2, 28 thg 12 · 18:00 · 11 tháng
          trước" — measures 247px. Adding the row's fixed chrome (px-4, the
          36px avatar, three gap-3 gaps, the unread dot and the dismiss
          button) puts the floor at 387px; 400 leaves a little slack. Below
          that the line wraps to two rows and the feed loses its rhythm. */}
      <PopoverContent align="end" className="w-100 p-0 max-w-[calc(100vw-2rem)]">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("title")}</p>
        </div>
        {/* Mounted only while open, so the feed query never runs for someone
            who is simply browsing. */}
        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            limit={PREVIEW_COUNT}
            showSeeAll
            onNavigate={() => setOpen(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
