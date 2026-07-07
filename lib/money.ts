import type { createFormatter } from "next-intl";
import { USD_TO_VND } from "@/lib/data/listings";

/* next-intl's formatter shape — what useFormatter() (components) and
   getFormatter() (metadata, actions) both return. */
type NumberFormatter = Pick<ReturnType<typeof createFormatter>, "number">;

/** Locale-aware monthly price. Prices are stored as a single USD amount;
    `vi` renders VND (converted at the fixed USD_TO_VND rate), `en` renders
    USD. Both drop the fractional part. */
export function formatMoney(
  format: NumberFormatter,
  locale: string,
  usd: number
): string {
  return locale === "vi"
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
