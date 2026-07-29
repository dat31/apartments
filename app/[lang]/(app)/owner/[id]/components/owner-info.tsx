import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Calendar, Check, Clock, Globe, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PALETTE, initialsOf } from "@/lib/data/listings";
import { getOwnerProfile } from "@/lib/services/owners";
import {
  OwnerRatingSummary,
  OwnerRatingSummarySkeleton,
} from "./owner-rating-summary";

/* The owner hero — avatar, badges, bio and the host stats grid. Async server
   component reading only the owner, so it paints as soon as that resolves.

   The rating box is the one part that needs the review list, so it streams
   separately as <OwnerRatingSummary> below its own boundary; neither the
   reviews nor the listings query holds up the identity half of the hero. */
export async function OwnerInfo({ id }: { id: string }) {
  const [t, format, owner] = await Promise.all([
    getTranslations("owner"),
    getFormatter(),
    getOwnerProfile(id),
  ]);
  // The page 404s on an unknown owner before this ever renders.
  if (!owner) return null;

  const displayName = owner.key === "you" ? t("you") : owner.name;
  const color = PALETTE[owner.palette % PALETTE.length][0];

  // owner.joined is a "YYYY-MM" key → locale month + year.
  const [jy, jm] = owner.joined.split("-").map(Number);
  const joinedLabel = format.dateTime(new Date(jy, jm - 1, 1), {
    month: "long",
    year: "numeric",
  });

  // Localize the small fixed sets of seed values shown in the stats.
  const RESPONSE_TIME_KEY: Record<string, string> = {
    "within an hour": "hour",
    "within a few hours": "fewHours",
    "within a day": "day",
  };
  const respondsValue = RESPONSE_TIME_KEY[owner.responseTime]
    ? t(`responseTime.${RESPONSE_TIME_KEY[owner.responseTime]}`)
    : owner.responseTime;

  const stats = [
    { label: t("stats.memberSince"), value: joinedLabel || "—", icon: Calendar },
    { label: t("stats.responseRate"), value: `${owner.responseRate}%`, icon: MessageSquare },
    { label: t("stats.responds"), value: respondsValue, icon: Clock },
    {
      label: t("stats.languages"),
      value: owner.languages.map((l) => t(`language.${l.toLowerCase()}`)).join(", "),
      icon: Globe,
    },
  ];

  return (
    <section className="bg-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <div
          className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 grid place-items-center"
          style={{ background: color }}
        >
          <span className="text-3xl sm:text-4xl font-semibold text-background/95 select-none">
            {initialsOf(owner.name)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {owner.superhost && (
              <Badge>
                <ShieldCheck size={13} /> {t("superhost")}
              </Badge>
            )}
            {owner.verified && (
              <Badge variant="secondary">
                <Check size={13} /> {t("verified")}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            {displayName}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={16} /> {t("joined", { date: joinedLabel })}
            </span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground text-pretty max-w-xl">
            {owner.bio}
          </p>
        </div>

        <Suspense fallback={<OwnerRatingSummarySkeleton />}>
          <OwnerRatingSummary id={id} />
        </Suspense>
      </div>

      <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {stats.map(({ label, value, icon: I }) => (
          <div key={label} className="bg-card px-4 py-4">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              <I size={14} /> {label}
            </span>
            <p className="mt-1.5 font-medium capitalize leading-snug">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Mirrors the hero's three columns and the four-cell stats grid so the page
   doesn't shift when the real thing lands. */
export function OwnerInfoSkeleton() {
  return (
    <section className="bg-card p-6 sm:p-8" aria-busy="true">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <Skeleton className="skeleton w-24 h-24 sm:w-32 sm:h-32 shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="skeleton h-5 w-32" />
          <Skeleton className="skeleton mt-2 h-10 w-2/3" />
          <Skeleton className="skeleton mt-2.5 h-5 w-44" />
          <Skeleton className="skeleton mt-4 h-4 w-full max-w-xl" />
          <Skeleton className="skeleton mt-2 h-4 w-4/5 max-w-xl" />
        </div>
        <OwnerRatingSummarySkeleton />
      </div>
      <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card px-4 py-4">
            <Skeleton className="skeleton h-3.5 w-24" />
            <Skeleton className="skeleton mt-2 h-5 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}
