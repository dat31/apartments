import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { OwnerAvatarGlyph, OwnerName } from "./viewer-is-owner";
import { Skeleton } from "@/components/ui/skeleton";
import { PALETTE } from "@/lib/data/listings";
import { getOwnerProfile } from "@/lib/services/owners";

/* The "listed by" host card on the detail page — avatar, name, and a link
   into the owner's profile.

   Async server component that fetches its own owner (getOwnerProfile is
   "use cache"d), so it can stream inside its own <Suspense> instead of
   blocking the listing content above it.
   Rendered twice — inline on mobile, in the sticky sidebar on desktop — with
   `className` carrying the position-specific spacing. */
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
  // "You" covers the seed "you" demo owner used by the sample data, plus the
  // signed-in host viewing their own listing — the latter is resolved after
  // hydration (see ./viewer-is-owner) so this card stays prerenderable.
  const name = owner?.name ?? ownerKey;
  const isSeedOwner = ownerKey === "you";

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
        <OwnerAvatarGlyph
          ownerId={ownerKey}
          isSeedOwner={isSeedOwner}
          name={name}
        />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{t("listedBy")}</p>
        <p className="font-medium capitalize group-hover:text-primary transition-colors flex items-center gap-1.5">
          <OwnerName
            ownerId={ownerKey}
            isSeedOwner={isSeedOwner}
            youLabel={t("you")}
            name={name}
          />{" "}
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
