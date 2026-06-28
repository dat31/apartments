import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function StarRow({
  value,
  size = 18,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const t = useTranslations("detail.reviews");
  const full = Math.round(value);
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-primary", className)}
      aria-label={t("outOf", { value: value.toFixed(1) })}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={(i < full) ? "currentColor" : "none"} size={size} />
      ))}
    </span>
  );
}
