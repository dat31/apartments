import type * as React from "react";
import { cn } from "@/lib/utils";

/** A small fact about a room in the rail: what kind it is, whether the tour
    opens here, whether one of its doors is broken. */
export function RoomFlag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "primary" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-medium",
        tone === "primary" && "bg-primary text-primary-foreground",
        tone === "destructive" && "bg-destructive text-white",
        !tone && "bg-secondary text-secondary-foreground"
      )}
    >
      {children}
    </span>
  );
}
