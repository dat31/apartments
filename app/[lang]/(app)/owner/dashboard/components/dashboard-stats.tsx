"use client";

import { useTranslations } from "next-intl";
import { StatCard } from "./stat-card";
import { useListings } from "@/hooks/use-listings";
import { useOwnerTours } from "@/hooks/use-owner-tours";
import { Building2, CircleCheck, Calendar, Clock } from "lucide-react";

export function DashboardStats() {
  const t = useTranslations("dashboard.stats");
  const { listings: mine } = useListings();
  const { items } = useOwnerTours();

  const active = mine.filter((l) => l.status === "active");

  const pending = items.filter(
    (m) => m.tour.status === "pending" || m.tour.status === "reschedule"
  );
  const upcoming = items.filter((m) => m.tour.status === "confirmed");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label={t("listings")} value={mine.length} icon={Building2} accent />
      <StatCard label={t("active")} value={active.length} icon={CircleCheck} />
      <StatCard label={t("pendingTours")} value={pending.length} icon={Calendar} />
      <StatCard label={t("upcomingTours")} value={upcoming.length} icon={Clock} />
    </div>
  );
}
