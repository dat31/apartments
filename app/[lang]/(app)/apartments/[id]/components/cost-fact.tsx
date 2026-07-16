import { useTranslations } from "next-intl";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/* A single cost fact tile: label + value, or a muted "Not listed" that can
   never be mistaken for "free". */
export function CostFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode | null;
}) {
  const t = useTranslations("detail.costs");
  const known = value != null;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-card">
      <Icon
        size={18}
        className={cn(
          "mt-0.5 shrink-0",
          known ? "text-primary" : "text-muted-foreground/60"
        )}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {known ? (
          <p className="mt-0.5 font-medium tabular-nums text-pretty">{value}</p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground/70 italic">
            {t("notListed")}
          </p>
        )}
      </div>
    </div>
  );
}
