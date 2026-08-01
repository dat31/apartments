import type * as React from "react";

/** The quiet heading that separates one part of the editor from the next,
    with an optional count on the right. */
export function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h3>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      )}
    </div>
  );
}
