import { Badge } from "@/components/ui/badge";

/* Compact read-only summary chips for a described filter set (see
   describeSearch). Caps at `max` and folds the rest into a "+n" chip. */
export function FilterChips({
  chips,
  max = chips.length,
}: {
  chips: string[];
  max?: number;
}) {
  if (chips.length === 0) return null;
  const shown = chips.slice(0, max);
  const extra = chips.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((c) => (
        <Badge
          key={c}
          variant="secondary"
          className="h-6 rounded-none bg-muted px-2 text-muted-foreground"
        >
          {c}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge
          variant="secondary"
          className="h-6 rounded-none bg-muted px-2 text-muted-foreground"
        >
          +{extra}
        </Badge>
      )}
    </div>
  );
}
