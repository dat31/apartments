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
import { SAVED_PAGE_SIZE } from "@/hooks/use-saved-listings";

/* State-driven pager for the (client-rendered, backend-paginated) Saved page.
   Shares the same shadcn Pagination primitives as Browse's <ListingPagination>
   for identical styling, but page state lives in React (not the URL), so each
   control just calls onPageChange instead of navigating. */
export function SavedPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("apartments.pagination");

  const go = (p: number) => {
    const target = Math.min(Math.max(p, 1), totalPages);
    onPageChange(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = (page - 1) * SAVED_PAGE_SIZE;

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
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
                href="#"
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
              href="#"
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
          to: Math.min(start + SAVED_PAGE_SIZE, total),
          total,
        })}
      </p>
    </div>
  );
}
