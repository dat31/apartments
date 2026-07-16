"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, LayoutGrid } from "lucide-react";

/* Fewer than two usable homes (short URL, unsaved/deactivated listings, or
   columns removed down to one) — nudge back to the shortlist. */
export function PickTwo() {
  const t = useTranslations("saved.compare");
  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <Link
        href="/apartments/saved"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 focus-ring"
      >
        <ArrowLeft size={18} /> {t("back")}
      </Link>
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <LayoutGrid size={26} />
        </div>
        <h3 className="text-lg font-semibold">{t("pickTwoTitle")}</h3>
        <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
          {t("pickTwoBody")}
        </p>
        <Button asChild className="mt-5 h-11 gap-1.5">
          <Link href="/apartments/saved">
            <Heart size={16} /> {t("back")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
