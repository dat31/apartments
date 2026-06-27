"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/chip";
import { Check, Search } from "lucide-react";
import { AMENITY_ICONS } from "@/components/icons";
import { AMENITIES } from "@/lib/data/listings";
import { TYPES, districtLabel } from "@/schemas/listing";
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
        <h4 className={heading}>Search</h4>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Area, type, or name…"
            className={cn(FILLED_INPUT, "pl-9")}
          />
        </div>
      </div>

      <div>
        <h4 className={heading}>Home type</h4>
        <div className="flex flex-wrap gap-2">
          {["All", ...TYPES].map((t) => (
            <Chip
              key={t}
              active={filters.type === t}
              onClick={() => setParams({ type: t === "All" ? null : t })}
            >
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>District</h4>
        <div className="flex flex-wrap gap-2">
          {["All", ...districts].map((d) => (
            <Chip
              key={d}
              active={filters.district === d}
              onClick={() => setParams({ district: d === "All" ? null : d })}
            >
              {d === "All" ? d : districtLabel(d)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>Monthly price</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={FILLED_INPUT}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={FILLED_INPUT}
          />
        </div>
      </div>

      <div>
        <h4 className={heading}>Bedrooms</h4>
        <div className="flex flex-wrap gap-2">
          {["Any", "Studio", "1", "2", "3+"].map((b) => (
            <Chip
              key={b}
              active={filters.beds === b}
              onClick={() => setParams({ beds: b === "Any" ? null : b })}
            >
              {b}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h4 className={heading}>Amenities</h4>
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
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="secondary" className="h-11" onClick={reset}>
        Reset filters
      </Button>
    </div>
  );
}
