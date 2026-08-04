import { useTranslations } from "next-intl";
import { StatCard } from "./stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardCounts } from "../lib/counts";
import { Building2, CircleCheck, Calendar, Clock } from "lucide-react";

/* `counts={null}` is the streaming fallback the layout renders: the four
   tiles in their final positions with the numbers still arriving, rather
   than a blank strip that pushes the tabs down when it fills. */
export function DashboardStats({ counts }: { counts: DashboardCounts | null }) {
  const t = useTranslations("dashboard.stats");
  // Wide enough for three digits — the tiles are fixed-width anyway, so this
  // only has to look like a number, not reserve its exact width.
  const value = (n: number | undefined) =>
    n ?? <Skeleton className="skeleton h-9 w-12" />;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label={t("listings")}
        value={value(counts?.listings)}
        icon={Building2}
        accent
      />
      <StatCard
        label={t("active")}
        value={value(counts?.active)}
        icon={CircleCheck}
      />
      <StatCard
        label={t("pendingTours")}
        value={value(counts?.pendingTours)}
        icon={Calendar}
      />
      <StatCard
        label={t("upcomingTours")}
        value={value(counts?.upcomingTours)}
        icon={Clock}
      />
    </div>
  );
}
