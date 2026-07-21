import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localePath, pageAlternates, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { Logo } from "@/components/logo";
import { ToggleThemeButton } from "@/components/toggle-theme-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RoleChooser } from "./components/role-chooser";
import { StatsPanel } from "./components/stats-panel";
import { DistrictsSection } from "./components/districts-section";
import { NewestSection } from "./components/newest-section";
import { TrendingSection } from "./components/trending-section";
import { LandingFooter } from "./components/landing-footer";

// Title/description come from the layout defaults; the page only adds its
// canonical + hreflang alternates.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: pageAlternates(lang, "/") };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Danapa",
            url: SITE_URL + localePath(lang as Locale, "/"),
            inLanguage: lang,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Danapa",
            url: SITE_URL,
          },
        ]}
      />
      <header className="flex items-center justify-between px-6 sm:px-10 h-20">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ToggleThemeButton />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero — split at md: the welcome + role chooser on the left,
            platform stats on the right (stacks below on mobile). */}
        <section className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 anim-up">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start py-14 md:py-20">
            <div className="flex flex-col justify-start">
              <RoleChooser />
            </div>
            <StatsPanel />
          </div>
        </section>

        {/* Explore homes before choosing a role. Each section's header renders
            with this shell; its data-driven items stream behind their own
            Suspense boundary (availability labels are relative to the current
            time). */}
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col py-16 gap-16">
          <DistrictsSection />
          <NewestSection />
          <TrendingSection />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
