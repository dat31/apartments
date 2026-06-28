import { useFormatter, useLocale } from "next-intl";
import { USD_TO_VND } from "@/lib/data/listings";

/* Locale-aware monthly-price formatter. Prices are stored as a single USD
   amount; `vi` renders VND (converted at the fixed USD_TO_VND rate), `en`
   renders USD. Both drop the fractional part. Works in client and shared
   (server-rendered) components — no "use client" directive, like next-intl's
   own useFormatter/useLocale. */
export function useMoney() {
  const format = useFormatter();
  const locale = useLocale();
  return (usd: number) =>
    locale === "vi"
      ? format.number(usd * USD_TO_VND, {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        })
      : format.number(usd, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        });
}
