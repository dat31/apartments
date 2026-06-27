"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { type SortKey } from "@/schemas/filters";
import { parseSort } from "../lib/query";
import { useFilterNav } from "./use-filter-nav";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "low", label: "Price: low to high" },
  { value: "high", label: "Price: high to low" },
  { value: "area", label: "Largest area" },
];

/* Reads the active sort from the URL itself so the server shell that renders it
   stays static (no searchParams access above the Suspense boundary). */
export function SortMenu() {
  const { searchParams, setParams } = useFilterNav();
  const value = parseSort(Object.fromEntries(searchParams.entries()));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gap-2 h-9 bg-input border-transparent font-normal"
        >
          {SORT_OPTIONS.find((o) => o.value === value)?.label}
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) =>
            setParams({ sort: v === "featured" ? null : v })
          }
        >
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
