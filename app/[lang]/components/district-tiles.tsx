import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { money } from "@/lib/data/listings";
import { Card } from "@/components/ui/card";
import { type DistrictTile } from "../lib/landing";

export function DistrictTiles({ tiles }: { tiles: DistrictTile[] }) {
  const t = useTranslations("landing.districts");
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
      {tiles.map((d) => (
        <Link
          key={d.name}
          href={`/apartments?district=${encodeURIComponent(d.slug)}`}
          className="focus-ring anim-up rounded-xl"
        >
          <Card className="h-full min-h-40 gap-0 p-6 text-left transition-colors hover:bg-accent">
            <span className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: d.color }}
              />
              <span className="font-semibold tracking-tight text-balance leading-snug text-base">
                {d.name}
              </span>
            </span>
            <span className="mt-auto flex items-baseline gap-1.5 pt-4">
              <span className="font-semibold tracking-tight tabular-nums leading-none text-4xl">
                {d.count}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("homes", { count: d.count })}
              </span>
            </span>
            <span className="mt-2 block text-muted-foreground tabular-nums text-sm">
              {t("priceFrom", { price: money(d.from) })}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
