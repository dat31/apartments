import { useFormatter, useLocale } from "next-intl";
import { formatMoney } from "@/lib/money";

/* Locale-aware monthly-price formatter for components. Works in client and
   shared (server-rendered) components — no "use client" directive, like
   next-intl's own useFormatter/useLocale. The formatting rules live in
   lib/money so metadata code (getFormatter) can share them. */
export function useMoney() {
  const format = useFormatter();
  const locale = useLocale();
  return (usd: number) => formatMoney(format, locale, usd);
}
