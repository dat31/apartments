import { cn } from "@/lib/utils";
import { Check, type LucideIcon } from "lucide-react";

export function RoleCard({
  active,
  onClick,
  title,
  blurb,
  icon: I,
  points,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  blurb: string;
  icon: LucideIcon;
  points: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group text-left p-7 transition-all focus-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground hover:bg-accent hover:-translate-y-1"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center w-12 h-12 mb-5 transition-colors",
          active
            ? "bg-primary-foreground text-primary"
            : "bg-secondary text-primary"
        )}
      >
        <I size={24} />
      </span>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p
        className={cn(
          "mt-1.5 text-[15px] leading-relaxed",
          active ? "text-primary-foreground opacity-90" : "text-muted-foreground"
        )}
      >
        {blurb}
      </p>
      <ul className="mt-4 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm leading-snug">
            <Check
              size={16}
              className={cn(
                "mt-0.5 shrink-0",
                active ? "text-primary-foreground" : "text-primary"
              )}
            />
            <span
              className={
                active ? "text-primary-foreground opacity-90" : "text-muted-foreground"
              }
            >
              {p}
            </span>
          </li>
        ))}
      </ul>
    </button>
  );
}
