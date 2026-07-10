"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/chip";
import { Check, Search } from "lucide-react";
import { AMENITY_ICONS } from "@/components/icons";
import { AMENITIES } from "@/lib/data/listings";
import { TYPES, districtLabel } from "@/schemas/listing";
import { AVAIL_KEYS, MIN_AREA_OPTIONS } from "@/schemas/filters";
import { FILLED_INPUT } from "@/app/[lang]/(auth)/components/password-field";
import { parseFilters } from "../lib/query";
import { useFilterNav } from "./use-filter-nav";

/* Debounces a text field into a single URL param: keeps the input snappy
   while only navigating once typing settles. Resyncs when the URL changes
   underneath us (reset button, back/forward). */
function useDebouncedTextParam(
  key: string,
  urlValue: string,
  setParams: (patch: Record<string, string | null>) => void
) {
  const [value, setValue] = React.useState(urlValue);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(urlValue);
  }, [urlValue]);

  React.useEffect(() => {
    if (value === urlValue) return;
    const t = setTimeout(() => setParams({ [key]: value || null }), 350);
    return () => clearTimeout(t);
  }, [value, urlValue, key, setParams]);

  return [value, setValue] as const;
}

export function FiltersPanel({ districts = [] }: { districts?: string[] }) {
  const t = useTranslations("apartments");
  const { searchParams, setParams, reset } = useFilterNav();
  const filters = React.useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );

  const [q, setQ] = useDebouncedTextParam("q", filters.q, setParams);
  const [minPrice, setMinPrice] = useDebouncedTextParam(
    "minPrice",
    filters.minPrice,
    setParams
  );
  const [maxPrice, setMaxPrice] = useDebouncedTextParam(
    "maxPrice",
    filters.maxPrice,
    setParams
  );

  const toggleAmenity = (id: string) => {
    const next = filters.amenities.includes(id)
      ? filters.amenities.filter((a) => a !== id)
      : [...filters.amenities, id];
    setParams({ amenities: next.length ? next.join(",") : null });
  };

  const heading =
    "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h4 className={heading}>{t("filtersPanel.search")}</h4>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("filtersPanel.searchPlaceholder")}
            className={cn(FILLED_INPUT, "pl-9")}
          />
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.homeType")}</h4>
        <div className="flex flex-wrap gap-2">
          {["All", ...TYPES].map((opt) => (
            <Chip
              key={opt}
              active={filters.type === opt}
              onClick={() => setParams({ type: opt === "All" ? null : opt })}
            >
              {opt === "All" ? t("filtersPanel.all") : t(`types.${opt}`)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.moveInBy")}</h4>
        <div className="flex flex-wrap gap-2">
          {AVAIL_KEYS.map((k) => (
            <Chip
              key={k}
              active={filters.avail === k}
              onClick={() => setParams({ avail: k === "any" ? null : k })}
            >
              {t(`filtersPanel.avail.${k}`)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.district")}</h4>
        <div className="flex flex-wrap gap-2">
          {["All", ...districts].map((d) => (
            <Chip
              key={d}
              active={filters.district === d}
              onClick={() => setParams({ district: d === "All" ? null : d })}
            >
              {d === "All" ? t("filtersPanel.all") : districtLabel(d)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.monthlyPrice")}</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t("filtersPanel.min")}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={FILLED_INPUT}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t("filtersPanel.max")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={FILLED_INPUT}
          />
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.bedrooms")}</h4>
        <div className="flex flex-wrap gap-2">
          {["Any", "Studio", "1", "2", "3+"].map((b) => (
            <Chip
              key={b}
              active={filters.beds === b}
              onClick={() => setParams({ beds: b === "Any" ? null : b })}
            >
              {b === "Any"
                ? t("filtersPanel.any")
                : b === "Studio"
                  ? t("filtersPanel.studio")
                  : b}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.minArea")}</h4>
        <div className="flex flex-wrap gap-2">
          {MIN_AREA_OPTIONS.map((v) => (
            <Chip
              key={v || "any"}
              active={filters.minArea === v}
              onClick={() => setParams({ minArea: v || null })}
            >
              {v ? `${v} m²+` : t("filtersPanel.any")}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>{t("filtersPanel.amenities")}</h4>
        <div className="flex flex-col gap-1">
          {AMENITIES.map((a) => {
            const I = AMENITY_ICONS[a.icon];
            const on = filters.amenities.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAmenity(a.id)}
                className={cn(
                  "flex items-center gap-3 px-3 h-10 text-[15px] transition-colors focus-ring",
                  on
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5",
                    on ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {on ? <Check size={18} /> : <I size={18} />}
                </span>
                {t(`amenities.${a.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="secondary" className="h-11" onClick={reset}>
        {t("filtersPanel.reset")}
      </Button>
    </div>
  );
}
