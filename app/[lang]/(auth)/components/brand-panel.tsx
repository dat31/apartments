import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Check } from "lucide-react";

export function BrandPanel() {
  const t = useTranslations("auth.brand");
  const points = [t("point1"), t("point2"), t("point3")];

  return (
    <aside className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 xl:p-16">
      <Logo size={26} onDark className="anim-fade" />
      <div className="max-w-md anim-up">
        <p className="text-sm font-medium uppercase tracking-[0.22em] opacity-70 mb-4">
          {t("eyebrow")}
        </p>
        <h2 className="text-[2.6rem] xl:text-5xl font-semibold tracking-tight leading-[1.04] text-balance">
          {t("headline")}
        </h2>
        <p className="mt-5 text-lg leading-relaxed opacity-85 text-pretty">
          {t("lead")}
        </p>
        <ul className="mt-9 space-y-3.5 stagger">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 bg-primary-foreground/15 shrink-0">
                <Check size={15} />
              </span>
              <span className="opacity-90">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm opacity-60">{t("copyright")}</p>
    </aside>
  );
}
