import { useTranslations } from "next-intl";
import { LANDING_STATS } from "../constants/stats";
import { StatNumber } from "./stat-number";

/* Platform stats beside the welcome in the split hero — "plain" style:
   big figures with a labelled icon beneath, no card chrome. Server
   rendered; only each StatNumber's count-up is a client leaf. */
export function StatsPanel() {
  const t = useTranslations("landing.stats");

  return (
    <div className="w-full">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4">
        {t("eyebrow")}
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
        {LANDING_STATS.map(({ value, suffix, labelKey }) => (
          <div key={labelKey}>
            <StatNumber
              value={value}
              suffix={suffix}
              className="text-4xl sm:text-5xl text-primary"
            />
            <p className="mt-2 text-sm text-muted-foreground">{t(labelKey)}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        {t("caption")}
      </p>
    </div>
  );
}
