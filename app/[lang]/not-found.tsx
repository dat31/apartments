import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/error-shell";
import { GlyphTile } from "@/components/glyph-tile";
import { ChevronLeft, Search } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <ErrorShell>
      <div
        className="flex items-center justify-center gap-3 stagger"
        aria-label={t("notFoundAria")}
      >
        <GlyphTile glyph="4" size={104} />
        <GlyphTile glyph="0" size={104} lit="var(--accent)" litCell={[3, 4]} />
        <GlyphTile glyph="4" size={104} />
      </div>

      <h1 className="mt-10 text-[2rem] font-semibold tracking-tight text-balance">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 text-muted-foreground text-pretty max-w-md mx-auto">
        {t("notFoundBody")}
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-14 px-7 text-base gap-2">
          <Link href="/apartments">
            <Search size={18} /> {t("browse")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-14 px-7 text-base gap-2">
          <Link href="/apartments">
            <ChevronLeft size={18} /> {t("goBack")}
          </Link>
        </Button>
      </div>
    </ErrorShell>
  );
}
