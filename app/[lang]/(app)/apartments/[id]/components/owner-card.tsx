import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Check, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PALETTE } from "@/lib/data/listings";
import { getOwnerProfile } from "@/lib/services/owners";
import { viewerOwns } from "../lib/viewer-owns";

/* The "listed by" host card on the detail page — avatar, name, and a link
   into the owner's profile.

   Async server component that fetches its own owner (getOwnerProfile is
   "use cache"d; seed owners resolve with no query) and resolves whether the
   viewer is that owner (a cookie read), so it can stream inside its own
   <Suspense> instead of forcing the listing content above it to render
   per-request. Rendered twice — inline on mobile, in the sticky sidebar on
   desktop — with `className` carrying the position-specific spacing. */
export async function OwnerCard({
  ownerKey,
  fallbackPalette,
  className,
}: {
  ownerKey: string;
  fallbackPalette: number;
  className?: string;
}) {
  const t = await getTranslations("detail");
  const owner = await getOwnerProfile(ownerKey);
  // "You" covers the signed-in host viewing their own listing, plus the seed
  // "you" demo owner used by the sample data.
  const isYou = ownerKey === "you" || (await viewerOwns(ownerKey));
  const ownerLabel = isYou ? t("you") : owner?.name ?? ownerKey;

  return (
    <Link
      href={`/owner/${ownerKey}`}
      className={cn(
        "w-full flex items-center gap-3 text-left group focus-ring",
        className
      )}
    >
      <span
        className="inline-flex items-center justify-center w-11 h-11 shrink-0 font-semibold text-sm text-background/95"
        style={{
          background:
            PALETTE[(owner ? owner.palette : fallbackPalette) % PALETTE.length][0],
        }}
      >
        {isYou ? (
          <User size={20} className="text-background/95" />
        ) : (
          ownerLabel
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{t("listedBy")}</p>
        <p className="font-medium capitalize group-hover:text-primary transition-colors flex items-center gap-1.5">
          {ownerLabel}{" "}
          {owner?.verified && <Check size={14} className="text-primary" />}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">
          {t("viewProfile")} →
        </p>
      </div>
    </Link>
  );
}

/* Placeholder while the owner query streams — matches the avatar + three text
   lines so the card doesn't shift when it lands. */
export function OwnerCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-full flex items-center gap-3", className)}
      aria-busy="true"
    >
      <Skeleton className="skeleton w-11 h-11 shrink-0 rounded-none" />
      <div className="min-w-0 flex-1">
        <Skeleton className="skeleton h-4 w-16" />
        <Skeleton className="skeleton mt-1.5 h-4 w-24" />
        <Skeleton className="skeleton mt-1.5 h-3 w-20" />
      </div>
    </div>
  );
}
