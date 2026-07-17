"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useMoney } from "@/hooks/use-money";
import { type Filters } from "@/schemas/filters";
import { describeSearch } from "../lib/saved-search";

/** Locale-bound describeSearch: auto-name + summary chips for a filter set. */
export function useDescribeSearch() {
  const t = useTranslations("apartments");
  const money = useMoney();
  return useCallback(
    (filters: Filters) =>
      describeSearch(filters, {
        t: (key, values) => t(key, values),
        money,
      }),
    [t, money]
  );
}
