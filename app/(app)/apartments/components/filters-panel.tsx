import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/chip";
import { Check, Search } from "lucide-react";
import { AMENITY_ICONS } from "@/components/icons";
import { AMENITIES, TYPES } from "@/lib/data/listings";
import { FILLED_INPUT } from "@/app/(auth)/components/password-field";
import { type Filters } from "../schemas/filters";

export function FiltersPanel({
  filters,
  setFilters,
  onReset,
  districts = [],
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onReset: () => void;
  districts?: string[];
}) {
  const set = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const toggleAmenity = (id: string) =>
    setFilters((f) => ({
      ...f,
      amenities: f.amenities.includes(id)
        ? f.amenities.filter((a) => a !== id)
        : [...f.amenities, id],
    }));

  const heading = "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3";

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
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
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
              onClick={() => set({ type: t })}
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
              onClick={() => set({ district: d })}
            >
              {d}
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
            value={filters.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            className={FILLED_INPUT}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => set({ maxPrice: e.target.value })}
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
              onClick={() => set({ beds: b })}
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

      <Button variant="secondary" className="h-11" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
