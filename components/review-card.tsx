import * as React from "react";
import { type Review, monthLabel } from "@/lib/data/listings";
import { StarRow } from "@/components/star-row";

export function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="bg-card p-5 anim-up">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 bg-secondary text-secondary-foreground font-semibold text-sm shrink-0">
          {r.initials}
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-tight truncate">{r.author}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {monthLabel(r.date)}
          </p>
        </div>
        <StarRow value={r.rating} size={15} className="ml-auto shrink-0" />
      </div>
      {r.stay && (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Stayed at {r.stay}
        </p>
      )}
      <p className="mt-2 text-[15px] leading-relaxed text-foreground/90 text-pretty">
        {r.text}
      </p>
    </div>
  );
}
