"use client";

import { StatCard } from "./stat-card";
import { useListings } from "@/hooks/use-listings";
import { useTours } from "@/hooks/use-tours";
import { Building2, CircleCheck, Calendar, Clock } from "lucide-react";

export function DashboardStats() {
  const { listings } = useListings();
  const { tours } = useTours();

  const mine = listings.filter((l) => l.owner === "you");
  const active = mine.filter((l) => l.status === "active");

  const myTours = tours.filter((t) => t.ownerKey === "you");
  const pending = myTours.filter(
    (t) => t.status === "pending" || t.status === "reschedule"
  );
  const upcoming = myTours.filter((t) => t.status === "confirmed");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="Listings" value={mine.length} icon={Building2} accent />
      <StatCard label="Active" value={active.length} icon={CircleCheck} />
      <StatCard label="Pending tours" value={pending.length} icon={Calendar} />
      <StatCard label="Upcoming tours" value={upcoming.length} icon={Clock} />
    </div>
  );
}
