import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { ToggleThemeButton } from "@/components/toggle-theme-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RoleChooser } from "./components/role-chooser";
import { StatsPanel } from "./components/stats-panel";
import { LandingShowcase } from "./components/landing-showcase";
import { LandingShowcaseSkeleton } from "./components/landing-showcase-skeleton";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen flex flex-col">
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

        {/* Explore homes before choosing a role — streamed behind the static
            shell (availability labels are relative to the current time). */}
        <Suspense fallback={<LandingShowcaseSkeleton />}>
          <LandingShowcase />
        </Suspense>
      </main>

      <footer className="px-6 sm:px-10 h-16 flex items-center text-sm text-muted-foreground">
        <span>{t("footer")}</span>
      </footer>
    </div>
  );
}
