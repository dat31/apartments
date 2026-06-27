"use client";

import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { routing, localeNames, type Locale } from "@/i18n/routing";
import { usePathname, getPathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const current = useLocale();
  const pathname = usePathname();

  const switchTo = (locale: Locale) => {
    if (locale === current) return;
    // Remember the choice so the middleware honors it on unprefixed visits.
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
    const target = getPathname({ href: pathname, locale });
    // Full-page navigation: switching the locale segment re-renders the root
    // layout (<html lang> + next-themes script), which can't happen on a soft
    // client navigation. A hard load resets the document cleanly.
    window.location.assign(`${target}${window.location.search}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          className="h-9 gap-1.5 px-3"
          aria-label="Change language"
        >
          <Languages size={16} />
          <span className="hidden sm:inline uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => switchTo(locale)}
            data-active={locale === current}
            className="data-[active=true]:font-semibold"
          >
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
