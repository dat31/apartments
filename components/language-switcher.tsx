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
import { routing, localeNames } from "@/i18n/routing";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const current = useLocale();
  const pathname = usePathname();

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
            asChild
            data-active={locale === current}
            className="data-[active=true]:font-semibold"
          >
            {/* next-intl <Link> with a `locale` prop keeps the same path and
                switches the locale via a soft navigation (it also updates the
                NEXT_LOCALE cookie). */}
            <Link href={pathname} locale={locale}>
              {localeNames[locale]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
