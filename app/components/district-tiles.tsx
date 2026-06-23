import Link from "next/link";
import { money } from "@/lib/data/listings";
import { Card } from "@/components/ui/card";
import { type DistrictTile } from "../lib/landing";

export function DistrictTiles({ tiles }: { tiles: DistrictTile[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
      {tiles.map((d) => (
        <Link
          key={d.name}
          href={`/apartments?district=${encodeURIComponent(d.name)}`}
          className="focus-ring anim-up rounded-xl"
        >
          <Card className="h-full min-h-40 gap-0 px-6 py-6 text-left transition-colors hover:bg-accent">
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
                {d.count === 1 ? "home" : "homes"}
              </span>
            </span>
            <span className="mt-2 block text-muted-foreground tabular-nums text-sm">
              {money(d.from)}/mo from
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
