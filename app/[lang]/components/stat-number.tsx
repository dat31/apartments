"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type StatNumberProps = {
  value: number;
  suffix?: string;
  className?: string;
};

/** Locale-formatted number that eases from 0 → value on mount.
 *  Renders the final value on the server (and when reduced motion is
 *  requested), so the SSR markup is always the true figure. */
export function StatNumber({ value, suffix, className }: StatNumberProps) {
  const locale = useLocale();
  const [display, setDisplay] = React.useState(() =>
    new Intl.NumberFormat(locale).format(value)
  );

  React.useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Reduced motion: the initializer already renders the final value.
    if (reduce) return;

    const nf = new Intl.NumberFormat(locale);
    let raf = 0;
    const start = performance.now();
    const duration = 1000;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(nf.format(Math.round(value * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, locale]);

  return (
    <div
      className={cn(
        "font-mono font-semibold tracking-tight tabular-nums leading-none",
        className
      )}
    >
      {display}
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </div>
  );
}
