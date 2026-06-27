"use client";

import { useLocalizedRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { OWNERS } from "@/lib/data/listings";
import { Plus } from "lucide-react";

export function DashboardHeader() {
  const router = useLocalizedRouter();
  const { profile } = useProfile();
  const ownerName = profile.name?.trim() || OWNERS.you.name;
  const firstName = ownerName.split(/\s+/)[0];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Owner dashboard
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
      </div>
      <Button onClick={() => router.push("/apartments/create")}>
        <Plus size={18} /> New listing
      </Button>
    </div>
  );
}
