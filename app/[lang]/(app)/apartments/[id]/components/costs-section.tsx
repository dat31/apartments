import { useTranslations } from "next-intl";
import { CalendarDays, Check, KeyRound, Receipt } from "lucide-react";
import { UTILITY_ICONS } from "@/components/icons";
import { useMoney } from "@/hooks/use-money";
import { depositCash, hasAnyCost, utilityQuote } from "@/lib/listing-costs";
import { cn } from "@/lib/utils";
import { UTILITY_IDS, type Listing } from "@/schemas/listing";
import { CostFact } from "./cost-fact";
import { MoveInEstimate } from "./move-in-estimate";
import { TransparentPricing } from "./transparent-pricing";
import { type ReactNode } from "react";

/* Renter "Costs & terms" section for the listing detail page: the move-in
   estimate up top, then deposit / minimum lease / utilities. Renders nothing
   when a listing has no cost info at all (most at launch) — no empty shell. */
export function CostsSection({ listing }: { listing: Listing }) {
  const t = useTranslations("detail.costs");
  const money = useMoney();
  const costs = listing.costs;
  if (!hasAnyCost(costs)) return null;

  let depositValue: ReactNode = null;
  if (costs?.deposit === "none") {
    depositValue = t("depositNone");
  } else if (costs?.deposit === "1mo" || costs?.deposit === "2mo") {
    const cash = depositCash(listing.price, costs);
    depositValue = (
      <>
        {t("depositMonths", { count: costs.deposit === "1mo" ? 1 : 2 })}
        {cash != null && (
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            ≈ {money(cash)}
          </span>
        )}
      </>
    );
  } else if (costs?.deposit === "custom") {
    const cash = depositCash(listing.price, costs);
    depositValue = cash != null ? money(cash) : null;
  }

  const lease = costs?.minLease;
  const leaseValue =
    lease === 0
      ? t("leaseNone")
      : lease != null
        ? t("leaseMonths", { count: lease })
        : null;

  const anyUtility = UTILITY_IDS.some((id) => costs?.util[id]);

  return (
    <section className="mt-8" aria-label={t("aria")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt size={19} className="text-primary" /> {t("title")}
        </h2>
        <TransparentPricing listing={listing} />
      </div>

      <MoveInEstimate listing={listing} />

      {/* Deposit + minimum lease */}
      <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
        <CostFact icon={KeyRound} label={t("deposit")} value={depositValue} />
        <CostFact icon={CalendarDays} label={t("minLease")} value={leaseValue} />
      </div>

      {/* Utilities */}
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-2">
          {t("utilities")}
        </p>
        {anyUtility ? (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {UTILITY_IDS.map((id) => {
              const Icon = UTILITY_ICONS[id];
              const quote = utilityQuote(costs, id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-card"
                >
                  <span className="flex items-center gap-2.5 text-[15px]">
                    <Icon size={17} className="text-muted-foreground shrink-0" />{" "}
                    {t(`utility.${id}`)}
                  </span>
                  {quote != null ? (
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums flex items-center gap-1.5",
                        quote.kind === "included" && "text-primary"
                      )}
                    >
                      {quote.kind === "included" && <Check size={14} />}
                      {quote.kind === "included"
                        ? t("included")
                        : quote.kind === "metered"
                          ? t("metered")
                          : t("fixedPerMonth", { amount: money(quote.amount) })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/70 italic">
                      {t("notListed")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-3 bg-card">
            <p className="text-sm text-muted-foreground text-pretty">
              {t("askOwner")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
