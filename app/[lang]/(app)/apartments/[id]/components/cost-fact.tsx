import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

/* A single cost fact tile: label + value, or a muted "Not listed" that can
   never be mistaken for "free". */
export function CostFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode | null;
}) {
  const t = useTranslations("detail.costs");
  return (
    <div className="px-4 py-3.5 bg-card">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      {value != null ? (
        <p className="mt-0.5 font-medium tabular-nums text-pretty">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm text-muted-foreground/70 italic">
          {t("notListed")}
        </p>
      )}
    </div>
  );
}
