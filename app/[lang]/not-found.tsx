import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/error-shell";
import { GlyphTile } from "@/components/glyph-tile";
import { ChevronLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <ErrorShell>
      <div
        className="flex items-center justify-center gap-3 stagger"
        aria-label="Error 404: page not found"
      >
        <GlyphTile glyph="4" size={104} />
        <GlyphTile glyph="0" size={104} lit="var(--accent)" litCell={[3, 4]} />
        <GlyphTile glyph="4" size={104} />
      </div>

      <h1 className="mt-10 text-[2rem] font-semibold tracking-tight text-balance">
        This place isn&apos;t on the map
      </h1>
      <p className="mt-3 text-muted-foreground text-pretty max-w-md mx-auto">
        The page you&apos;re looking for may have moved, or the address has a
        typo. Either way, there&apos;s nothing listed here.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-14 px-7 text-base gap-2">
          <Link href="/apartments">
            <Search size={18} /> Browse apartments
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-14 px-7 text-base gap-2">
          <Link href="/apartments">
            <ChevronLeft size={18} /> Go back
          </Link>
        </Button>
      </div>
    </ErrorShell>
  );
}
