import * as React from "react";

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
