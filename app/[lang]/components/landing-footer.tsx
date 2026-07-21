import { getTranslations } from "next-intl/server";

/* Landing page footer. Owns its own translation so the root page stays free of
   any `await getTranslations` on its render path. */
export async function LandingFooter() {
  const t = await getTranslations("landing");
  return (
    <footer className="px-6 sm:px-10 h-16 flex items-center text-sm text-muted-foreground">
      <span>{t("footer")}</span>
    </footer>
  );
}
