"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/chip";
import type { DashboardCounts } from "../lib/counts";
import {
  Calendar,
  CircleCheck,
  Clock,
  LayoutGrid,
  Pencil,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count: number | null;
};

/* Still a client component — the active-tab highlight needs usePathname, and
   that is the only thing here the server can't decide. The counts it used to
   fetch through client data hooks now arrive as a prop from the
   layout's Suspense slot, so this file has no data hooks left.

   `counts={null}` is the streaming fallback: every count slot renders empty,
   exactly as availability's always does, and the navigation itself is usable
   from the first paint rather than hidden behind a skeleton. */
export function DashboardNav({
  variant,
  counts,
}: {
  variant: "sidebar" | "chips";
  counts: DashboardCounts | null;
}) {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const base = "/owner/dashboard";
  const isActive = (href: string) => pathname === href;

  const items: NavItem[] = [
    {
      href: `${base}/overview`,
      label: t("overview"),
      icon: LayoutGrid,
      count: counts?.listings ?? null,
    },
    {
      href: `${base}/active`,
      label: t("active"),
      icon: CircleCheck,
      count: counts?.active ?? null,
    },
    {
      href: `${base}/drafts`,
      label: t("drafts"),
      icon: Pencil,
      count: counts?.drafts ?? null,
    },
    {
      href: `${base}/tours`,
      label: t("tours"),
      icon: Calendar,
      count: counts?.pendingTours ?? null,
    },
    { href: `${base}/availability`, label: t("availability"), icon: Clock, count: null },
  ];

  if (variant === "chips") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map(({ href, label, count }) => (
          <Chip key={href} active={isActive(href)} asChild className="shrink-0">
            <Link href={href}>
              {label}
              {count != null ? ` (${count})` : ""}
            </Link>
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, count }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-between px-3.5 h-11 text-[15px] font-medium transition-colors focus-ring",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon size={18} /> {label}
            </span>
            {count != null && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active
                    ? "text-sidebar-primary-foreground opacity-80"
                    : "text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
