import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/* Compact metric tile for the dashboard header. `accent` highlights the
   primary metric using the brand color. */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "gap-0 p-5 ring-0",
        accent
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-sm font-medium",
            accent ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        <Icon
          size={18}
          className={accent ? "text-primary-foreground/80" : "text-primary"}
        />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </Card>
  );
}
