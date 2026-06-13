import * as React from "react";
import { cn } from "@/lib/utils";
import { PALETTE } from "@/lib/data/listings";
import { acctInitials } from "@/lib/data/profile";

/* Square color-block avatar with initials — matches the system's square
   color blocks (the round Avatar primitive doesn't fit this language). */
export function ProfileAvatar({
  name,
  palette = 1,
  size = 40,
  className = "",
}: {
  name: string;
  palette?: number;
  size?: number;
  className?: string;
}) {
  const color = (PALETTE[palette % PALETTE.length] || PALETTE[0])[0];
  return (
    <span
      className={cn(
        "inline-grid place-items-center font-semibold text-background/95 select-none shrink-0",
        className
      )}
      style={{
        background: color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {acctInitials(name)}
    </span>
  );
}
