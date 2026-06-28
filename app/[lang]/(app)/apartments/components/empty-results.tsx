"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useFilterNav } from "./use-filter-nav";

export function EmptyResults() {
  const t = useTranslations("apartments.empty");
  const { reset } = useFilterNav();
  return (
    <div className="bg-card p-16 text-center anim-fade">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
        <Search size={26} />
      </div>
      <h3 className="text-lg font-semibold">{t("title")}</h3>
      <p className="mt-1 text-muted-foreground">{t("body")}</p>
      <Button variant="secondary" className="mt-5 h-11" onClick={reset}>
        {t("reset")}
      </Button>
    </div>
  );
}
