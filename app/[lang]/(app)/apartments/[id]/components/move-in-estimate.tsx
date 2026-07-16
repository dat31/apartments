import { useTranslations } from "next-intl";
import { Check, Wallet } from "lucide-react";
import { useMoney } from "@/hooks/use-money";
import { moveInEstimate } from "@/lib/listing-costs";
import { cn } from "@/lib/utils";
import { type Listing } from "@/schemas/listing";

/* The hero of the costs section: estimated move-in cost (first month +
   deposit) — the number renters actually budget against. Renders nothing
   when the deposit is unknown, because then there is no honest estimate.
   `variant`: "hero" for the main-column emphasis block, "compact" for the
   sticky booking card. */
export function MoveInEstimate({
  listing,
  variant = "hero",
  className,
}: {
  listing: Listing;
  variant?: "hero" | "compact";
  className?: string;
}) {
  const t = useTranslations("detail.costs");
  const money = useMoney();
  const mi = moveInEstimate(listing.price, listing.costs);
  if (!mi) return null;

  if (variant === "compact") {
    return (
      <div className={cn("bg-secondary px-3.5 py-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("moveInShort")}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-background px-1.5 py-0.5">
            {t("estimateTag")}
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums leading-none">
          ~{money(mi.total)}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums text-pretty">
          {mi.noDeposit
            ? t("compactNoDeposit")
            : t("compactBreakdown", {
                first: money(mi.first),
                deposit: money(mi.deposit),
              })}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-secondary p-5 sm:p-6", className)}>
      <div className="flex items-center gap-2">
        <Wallet size={16} className="text-primary" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("moveIn")}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-background px-1.5 py-0.5">
          {t("estimateTag")}
        </span>
      </div>
      <p className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums leading-none">
        ~{money(mi.total)}
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {mi.noDeposit ? (
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Check size={15} className="text-primary" /> {t("noDepositLine")}
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              {t("firstMonth")}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {money(mi.first)}
              </span>
            </span>
            <span className="text-muted-foreground/50">+</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              {t("deposit")}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {money(mi.deposit)}
              </span>
            </span>
          </>
        )}
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground text-pretty">
        {t("moveInNote")}
      </p>
    </div>
  );
}
