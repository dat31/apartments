"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/chip";
import { useListings } from "@/hooks/use-listings";
import { useOwnerTours } from "@/hooks/use-owner-tours";
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

function useNavItems(): NavItem[] {
  const t = useTranslations("dashboard.nav");
  const { listings: mine } = useListings();
  const { items } = useOwnerTours();
  const base = "/owner/dashboard";

  return [
    { href: `${base}/overview`, label: t("overview"), icon: LayoutGrid, count: mine.length },
    {
      href: `${base}/active`,
      label: t("active"),
      icon: CircleCheck,
      count: mine.filter((l) => l.status === "active").length,
    },
    {
      href: `${base}/drafts`,
      label: t("drafts"),
      icon: Pencil,
      count: mine.filter((l) => l.status === "draft").length,
    },
    {
      href: `${base}/tours`,
      label: t("tours"),
      icon: Calendar,
      count: items.filter(
        (m) => m.tour.status === "pending" || m.tour.status === "reschedule"
      ).length,
    },
    { href: `${base}/availability`, label: t("availability"), icon: Clock, count: null },
  ];
}

export function DashboardNav({ variant }: { variant: "sidebar" | "chips" }) {
  const pathname = usePathname();
  const items = useNavItems();
  const isActive = (href: string) => pathname === href;

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
