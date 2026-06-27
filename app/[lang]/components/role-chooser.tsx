import { useTranslations } from "next-intl";
import { RoleCards } from "./role-cards";

export function RoleChooser() {
  const t = useTranslations("landing.chooser");
  return (
    <div className="w-full max-w-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">
        {t("eyebrow")}
      </p>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
        {t("headline")}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground text-pretty">
        {t("sub")}
      </p>

      <RoleCards />
    </div>
  );
}
