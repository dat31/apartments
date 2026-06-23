"use client";

import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useFilterNav } from "./use-filter-nav";

export function EmptyResults() {
  const { reset } = useFilterNav();
  return (
    <div className="bg-card p-16 text-center anim-fade">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
        <Search size={26} />
      </div>
      <h3 className="text-lg font-semibold">No homes match those filters</h3>
      <p className="mt-1 text-muted-foreground">
        Try widening your price range or clearing a filter.
      </p>
      <Button variant="secondary" className="mt-5 h-11" onClick={reset}>
        Reset filters
      </Button>
    </div>
  );
}
