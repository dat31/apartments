import * as React from "react";
import { cn } from "@/lib/utils";

/* Interactive filter/tag toggle — composed natively since shadcn's Badge
   is non-interactive. */
export function Chip({
  active = false,
  className = "",
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-active={active}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium select-none whitespace-nowrap transition-colors cursor-pointer focus-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    />
  );
}
