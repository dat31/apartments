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
  /* A node, not just a number, so a tile can hold a skeleton while its count
     streams in — see DashboardStats. */
  value: React.ReactNode;
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
      {/* A div rather than a p: the value may be a skeleton element, which a
          paragraph can't legally contain. */}
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </Card>
  );
}
