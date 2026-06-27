"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { locales, localeNames, LOCALE_COOKIE } from "@/lib/i18n/config";
import { useLocale, stripLocale } from "@/lib/i18n/navigation";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = useLocale();

  const switchTo = (locale: string) => {
    if (locale === current) return;
    // Remember the choice so the proxy honors it on unprefixed visits.
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
    const rest = stripLocale(pathname);
    const query = searchParams.toString();
    router.push(`/${locale}${rest === "/" ? "" : rest}${query ? `?${query}` : ""}`);
    router.refresh();
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
        {locales.map((locale) => (
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
