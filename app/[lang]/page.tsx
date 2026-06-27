import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { ToggleThemeButton } from "@/components/toggle-theme-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RoleChooser } from "./components/role-chooser";
import { HeroSection } from "./components/hero-section";
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
        {/* Hero — split at md; role chooser (theirs) on the left,
            our animated product hero on the right (hidden on mobile). */}
        <section className="grid md:grid-cols-2 md:min-h-[calc(100vh-5rem)]">
          <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 pt-4 pb-14 md:py-16 anim-up">
            <RoleChooser />
          </div>

          <div className="relative hidden md:flex items-center overflow-hidden bg-card/40">
            <HeroSection />
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
