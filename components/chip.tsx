import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/* Interactive filter/tag toggle — composed natively since shadcn's Badge
   is non-interactive. Pass `asChild` to render as another element (e.g. a
   Link) while keeping the chip styling. */
export function Chip({
  active = false,
  className = "",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      {...(asChild ? {} : { type: "button" as const })}
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
