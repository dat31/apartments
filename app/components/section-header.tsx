import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";

export function SectionHeader({
  icon,
  title,
  sub,
  action,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 bg-secondary text-primary shrink-0">
            {icon}
          </span>
          {title}
        </h2>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-ring whitespace-nowrap"
        >
          {action.label} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}
