import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { type Review } from "@/schemas/review";
import { StarRow } from "@/components/star-row";

export function ReviewCard({ r }: { r: Review }) {
  const t = useTranslations("detail.reviews");
  const format = useFormatter();
  // r.date is a "YYYY-MM" key.
  const [y, m] = r.date.split("-").map(Number);
  const dateLabel = format.dateTime(new Date(y, m - 1, 1), {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="bg-card p-5 anim-up">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 bg-secondary text-secondary-foreground font-semibold text-sm shrink-0">
          {r.initials}
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-tight truncate">{r.author}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <StarRow value={r.rating} size={15} className="ml-auto shrink-0" />
      </div>
      {r.stay && (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t("stayedAt", { place: r.stay })}
        </p>
      )}
      <p className="mt-2 text-[15px] leading-relaxed text-foreground/90 text-pretty">
        {r.text}
      </p>
    </div>
  );
}
