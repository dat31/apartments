"use client";

import { useEffect } from "react";

// Keeps <html lang> in sync with the active locale. The <html> element lives in
// the non-localized root layout, so the attribute is updated client-side when
// the locale changes (SSR renders the default locale).
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
