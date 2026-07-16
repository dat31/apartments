import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { isTransparent } from "@/lib/listing-costs";
import { cn } from "@/lib/utils";
import { type Listing } from "@/schemas/listing";

/* Quiet "transparent pricing" signal — a whisper, not a badge. Only shows on
   listings whose cost info is complete; must never read as paid/verified. */
export function TransparentPricing({
  listing,
  className,
}: {
  listing: Listing;
  className?: string;
}) {
  const t = useTranslations("detail.costs");
  if (!isTransparent(listing.costs)) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
        className
      )}
      title={t("transparentHint")}
    >
      <CircleCheck size={14} className="text-primary shrink-0" />{" "}
      {t("transparent")}
    </span>
  );
}
