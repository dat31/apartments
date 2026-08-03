"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { localeNames, type Locale } from "@/i18n/routing";
import { DEFAULT_BASE_LOCALE, type LocalizedListing } from "@/schemas/listing";

/* Provenance, and the way back to the owner's own words.

   One line does both jobs: which language this home was written in, and an
   offer to read it. An owner's own English can be better or worse than their
   Vietnamese, and some renters read both — but nobody is made to, so the
   original stays folded away until it's asked for.

   Silent unless the reader is actually being served a translation. When the
   home's own language is already the one being read, there is no provenance
   worth stating and nothing to offer: no line, no badge, no chrome. */
export function OriginalDisclosure({
  listing,
}: {
  listing: LocalizedListing;
}) {
  const t = useTranslations("detail");
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);

  const base = listing.baseLocale ?? DEFAULT_BASE_LOCALE;
  // The description is the field this offers, so it is the field that decides
  // whether there is an original to offer at all.
  if (listing.descLocale !== locale || base === locale) return null;

  return (
    <div className="mt-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Globe size={14} />
          {t("writtenIn", { original: localeNames[base as Locale] })}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="font-medium text-foreground hover:underline focus-ring"
        >
          {open ? t("hideOriginal") : t("readOriginal")}
        </button>
      </p>
      {open && (
        <div lang={base} className="mt-2.5 bg-secondary px-4 py-3 anim-fade">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
            {localeNames[base as Locale]}
          </p>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-secondary-foreground text-pretty">
            {listing.baseDesc}
          </p>
        </div>
      )}
    </div>
  );
}
