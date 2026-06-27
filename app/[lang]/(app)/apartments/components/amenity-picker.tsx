"use client";

import { Chip } from "@/components/chip";
import { AMENITY_ICONS } from "@/components/icons";
import { AMENITIES } from "@/lib/data/listings";

/* Toggleable amenity chips backed by the form's `amenities` string[]. */
export function AmenityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    );

  return (
    <div className="flex flex-wrap gap-2">
      {AMENITIES.map((a) => {
        const Icon = AMENITY_ICONS[a.icon];
        return (
          <Chip
            key={a.id}
            active={value.includes(a.id)}
            onClick={() => toggle(a.id)}
          >
            {Icon ? <Icon size={16} /> : null} {a.label}
          </Chip>
        );
      })}
    </div>
  );
}
