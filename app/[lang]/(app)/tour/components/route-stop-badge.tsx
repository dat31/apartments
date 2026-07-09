import { cn } from "@/lib/utils";

/* List-side counterpart of the map's numbered teardrop pin, so schedule
   cards, timeline nodes and map pins all read as the same object. The number
   is always the schedule position — pins never renumber. Decorative: the
   accompanying text carries the accessible name. */
export function RouteStopBadge({
  n,
  tone = "primary",
  size = 24,
}: {
  n: number;
  tone?: "primary" | "destructive";
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "route-teardrop absolute inset-0 -rotate-45",
          tone === "destructive" ? "bg-destructive" : "bg-primary"
        )}
      />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums",
          tone === "destructive"
            ? "text-destructive-foreground"
            : "text-primary-foreground"
        )}
      >
        {n}
      </span>
    </span>
  );
}
