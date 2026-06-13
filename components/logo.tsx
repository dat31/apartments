import * as React from "react";
import { cn } from "@/lib/utils";
import { DanapaMark } from "@/components/danapa-mark";

export function Logo({
  size = 26,
  variant = "tower",
  onDark = false,
  wordmark = true,
  subtitle = false,
  className = "",
}: {
  size?: number;
  variant?: "tower" | "monogram" | "floors" | "facade";
  onDark?: boolean;
  wordmark?: boolean;
  subtitle?: boolean;
  className?: string;
}) {
  const tile = size * 1.32;
  const box = onDark ? "var(--primary-foreground)" : "var(--primary)";
  const ink = onDark ? "var(--primary)" : "var(--primary-foreground)";
  const lit = onDark ? "var(--primary)" : "var(--accent)";
  return (
    <span
      className={cn("inline-flex items-center select-none", className)}
      style={{ gap: size * 0.46 }}
    >
      <DanapaMark variant={variant} size={tile} box={box} ink={ink} lit={lit} />
      {wordmark && (
        <span className="inline-flex flex-col justify-center leading-none">
          <span
            className="font-semibold tracking-tight"
            style={{ fontSize: size, letterSpacing: "-0.02em" }}
          >
            Danapa
          </span>
          {subtitle && (
            <span
              className="font-medium uppercase text-muted-foreground"
              style={{
                fontSize: size * 0.34,
                letterSpacing: "0.28em",
                marginTop: size * 0.18,
              }}
            >
              Da Nang
            </span>
          )}
        </span>
      )}
    </span>
  );
}
