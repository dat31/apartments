"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { useHydrated } from "@/hooks/use-hydrated";
import { Plus } from "lucide-react";

export function DashboardHeader() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  /* Who the owner is comes from a client-only store (the react-query cache,
     seeded from the session cookie after mount), so it is unknown while this
     route prerenders. Greeting them by a placeholder name in the meantime
     bakes "Welcome back, Host" into the static HTML and then swaps it for
     their real name on hydration — a mismatch, and a visible flash of the
     wrong greeting. Wait for the profile instead; `hostFallback` is for a
     signed-in owner who genuinely hasn't given a name.

     `useHydrated` as well as `ready`, for the same reason site-header.tsx
     uses it: the auth listener can write a user into the query cache while
     hydration is still in flight, which would flip `ready` mid-render and
     mismatch all over again. This one is false for the hydration render by
     construction. */
  const hydrated = useHydrated();
  const { profile, ready } = useProfile();
  const firstName = (profile.name?.trim() || t("hostFallback")).split(/\s+/)[0];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          {t("eyebrow")}
        </p>
        {/* h-9 matches the text-3xl line box, so the greeting lands without
            moving the stats below it. */}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {hydrated && ready ? (
            t("welcome", { name: firstName })
          ) : (
            <Skeleton className="skeleton h-9 w-72 max-w-full" />
          )}
        </h1>
      </div>
      <Button onClick={() => router.push("/apartments/create")}>
        <Plus size={18} /> {t("newListing")}
      </Button>
    </div>
  );
}
