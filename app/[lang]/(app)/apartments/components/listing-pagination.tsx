"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { PAGE_SIZE } from "../lib/query";
import { useFilterNav } from "./use-filter-nav";

export function ListingPagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const t = useTranslations("apartments.pagination");
  const { searchParams, setParams } = useFilterNav();

  // Real hrefs so links are crawlable / middle-clickable; onClick adds the
  // smooth scroll and avoids a full navigation.
  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  const go = (p: number) => {
    const target = Math.min(Math.max(p, 1), totalPages);
    setParams({ page: target <= 1 ? null : String(target) }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = (page - 1) * PAGE_SIZE;

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefFor(page - 1)}
              text={t("prev")}
              aria-disabled={page <= 1}
              className={cn(page <= 1 && "pointer-events-none opacity-40")}
              onClick={(e) => {
                e.preventDefault();
                go(page - 1);
              }}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href={hrefFor(i + 1)}
                isActive={i + 1 === page}
                onClick={(e) => {
                  e.preventDefault();
                  go(i + 1);
                }}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href={hrefFor(page + 1)}
              text={t("next")}
              aria-disabled={page >= totalPages}
              className={cn(
                page >= totalPages && "pointer-events-none opacity-40"
              )}
              onClick={(e) => {
                e.preventDefault();
                go(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("showing", {
          from: start + 1,
          to: Math.min(start + PAGE_SIZE, total),
          total,
        })}
      </p>
    </div>
  );
}
