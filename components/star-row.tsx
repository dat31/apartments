import * as React from "react";
import { cn } from "@/lib/utils";
import { IconStar } from "@/components/icons";

export function StarRow({
  value,
  size = 18,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const full = Math.round(value);
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-primary", className)}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <IconStar key={i} filled={i < full} size={size} />
      ))}
    </span>
  );
}
