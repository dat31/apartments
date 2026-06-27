import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HtmlLang } from "@/components/html-lang";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(routing.locales, lang)) notFound();

  // Opt into static rendering for this locale.
  setRequestLocale(lang);

  return (
    <NextIntlClientProvider>
      <HtmlLang locale={lang} />
      <TooltipProvider>{children}</TooltipProvider>
    </NextIntlClientProvider>
  );
}
