"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Bell, Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/auth";
import { parseFilters } from "../lib/query";
import {
  queryToFilters,
  savableFilterCount,
  searchSignature,
} from "../lib/saved-search";
import { useSavedSearches } from "../hooks/use-saved-searches";
import { SaveSearchDialog } from "./save-search-dialog";
import { SaveSearchSignInGate } from "./save-search-signin-gate";

/* "Save this search" affordance for the filters panel (desktop sidebar and
   mobile drawer). Invisible until at least one filter is set; flips to a
   quiet "saved" state when the current filter set is already saved. Signed-out
   renters get the sign-in gate — alerts need an email address. */
export function SaveSearch() {
  const t = useTranslations("apartments.savedSearches");
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const { searches } = useSavedSearches();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [gateOpen, setGateOpen] = React.useState(false);

  const filters = React.useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );

  if (savableFilterCount(filters) === 0) return null;

  const signature = searchSignature(filters);
  const saved = searches.find(
    (s) => searchSignature(queryToFilters(s.queryString)) === signature
  );

  return (
    <>
      {saved ? (
        <div className="flex h-11 items-center gap-2.5 bg-secondary px-3.5 text-sm font-medium text-secondary-foreground">
          <Check size={17} className="shrink-0 text-primary" />
          <span className="min-w-0 truncate">{t("alreadySaved")}</span>
          {saved.alerts && (
            <Bell size={15} className="ml-auto shrink-0 text-primary" />
          )}
        </div>
      ) : (
        <Button
          className="h-11 w-full"
          onClick={() => (user ? setDialogOpen(true) : setGateOpen(true))}
        >
          <Bookmark size={17} /> {t("saveButton")}
        </Button>
      )}
      {/* Mounted only while open so the form re-seeds from the current
          filters each time (defaultValues apply on mount). */}
      {dialogOpen && (
        <SaveSearchDialog
          open
          onClose={() => setDialogOpen(false)}
          filters={filters}
        />
      )}
      <SaveSearchSignInGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  );
}
