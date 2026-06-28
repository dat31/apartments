"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const t = useTranslations("owner.starPicker");
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div
      className="flex items-center gap-1.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="text-primary focus-ring p-0.5 active:scale-90"
          aria-label={t("stars", { count: n })}
        >
          <Star fill={(n <= shown) ? "currentColor" : "none"} size={30} />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground tabular-nums">
        {value ? `${value}.0` : t("tapToRate")}
      </span>
    </div>
  );
}
