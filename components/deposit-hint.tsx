import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { useMoney } from "@/hooks/use-money";
import { depositCash } from "@/lib/listing-costs";
import { cn } from "@/lib/utils";
import { type Listing } from "@/schemas/listing";

/* Tiny deposit scent for browse-grid cards ("1 mo deposit", "No deposit").
   Renders nothing when the deposit is unknown — never guesses. */
export function DepositHint({
  listing,
  className,
}: {
  listing: Listing;
  className?: string;
}) {
  const t = useTranslations("apartments.card");
  const money = useMoney();
  const deposit = listing.costs?.deposit;
  if (!deposit) return null;

  let label: string | null = null;
  if (deposit === "none") label = t("depositNone");
  else if (deposit === "1mo") label = t("depositMonths", { count: 1 });
  else if (deposit === "2mo") label = t("depositMonths", { count: 2 });
  else {
    const cash = depositCash(listing.price, listing.costs);
    label = cash != null ? t("depositAmount", { amount: money(cash) }) : null;
  }
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums",
        className
      )}
    >
      <KeyRound size={12} className="shrink-0" /> {label}
    </span>
  );
}
