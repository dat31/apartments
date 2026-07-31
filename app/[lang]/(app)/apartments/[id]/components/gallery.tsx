import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Grid2x2, Image as ImageIcon, Rotate3d } from "lucide-react";
import { GalleryLightbox } from "./gallery-lightbox";

/* Photo gallery: editorial mosaic on desktop, single hero on mobile, both
   opening a fullscreen lightbox carousel with a synced thumbnail rail. This is
   a Server Component — every tile renders on the server and carries a
   `data-shot` index; the client-only lightbox behaviour lives entirely in the
   <GalleryLightbox> island that wraps the markup. Renders real photos when
   `images` are present, falling back to the cover-color blocks otherwise. */
export function Gallery({
  images,
  colors,
  label,
  tourHref,
}: {
  images?: string[];
  colors: string[];
  label: string;
  /** Set when the listing has a published 360° tour: adds the entry pill over
      the cover shot. Safe inside <GalleryLightbox>, whose click delegation
      only fires for elements carrying `data-shot` — the pill carries none, so
      it navigates instead of opening the photo carousel. */
  tourHref?: string;
}) {
  const t = useTranslations("detail.gallery");
  const tv = useTranslations("virtualTour");
  const shots = images?.length ? images : colors;
  const hasPhotos = Boolean(images?.length);
  const n = shots.length;

  /* The cover shot is rendered twice — once in the desktop mosaic, once as the
     mobile hero — and only one of the two is ever visible. Both carry
     `priority`, so both emit a preload; sharing one `sizes` string keeps those
     preloads pointing at the same srcset candidate at every width, otherwise
     desktop would fetch a second copy for the hidden mobile tile. */
  const coverSizes =
    n === 1
      ? "100vw"
      : n === 2
        ? "(min-width: 640px) 50vw, 100vw"
        : "(min-width: 640px) 66vw, 100vw";

  const fill = (i: number, sizes: string, priority = false) =>
    hasPhotos ? (
      <Image
        src={shots[i]}
        alt={label}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
        /* `priority` alone only drops loading="lazy" and adds a preload link —
           Next passes fetchPriority straight through, so the LCP hint has to
           be set separately. */
        fetchPriority={priority ? "high" : undefined}
      />
    ) : (
      <span className="absolute inset-0" style={{ background: shots[i] }} />
    );

  /* A single preview tile — `frame` sets the aspect/size (defaults to a 16:9
     box; pass "h-full" for a tile that fills its grid cell instead).
     `more` overlays a "+N" veil on the last visible tile. The `data-shot`
     index is what the surrounding island reads to open the lightbox. */
  const tile = (
    i: number,
    sizes: string,
    {
      more = 0,
      frame = "aspect-[16/9]",
      priority = false,
    }: { more?: number; frame?: string; priority?: boolean } = {},
  ) => (
    <button
      key={i}
      data-shot={i}
      className={`group relative w-full overflow-hidden bg-secondary focus-ring ${frame}`}
    >
      {fill(i, sizes, priority)}
      <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-background text-xl font-semibold">
          +{more}
        </span>
      )}
    </button>
  );

  /* The 360° entry, overlaid on the cover shot at both breakpoints. */
  const tourPill = tourHref ? (
    <Button asChild size="sm" className="gap-2">
      <Link href={tourHref} data-testid="virtual-tour-entry">
        <Rotate3d size={16} /> {tv("entryCta")}
      </Link>
    </Button>
  ) : null;

  return (
    <GalleryLightbox shots={shots} hasPhotos={hasPhotos} label={label}>
      {/* Desktop: 16:9 mosaic — cover + stacked companions, each a true 16:9 tile */}
      <div className="relative hidden sm:block">
        {n === 1 ? (
          tile(0, coverSizes, { priority: true })
        ) : n === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            {tile(0, coverSizes, { priority: true })}
            {tile(1, "50vw")}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 items-stretch">
            <div className="col-span-2 flex">
              {tile(0, coverSizes, { frame: "h-full", priority: true })}
            </div>
            <div className="flex flex-col gap-2">
              {tile(1, "33vw")}
              {tile(2, "33vw", { more: n > 3 ? n - 3 : 0 })}
            </div>
          </div>
        )}
        {tourPill && <div className="absolute bottom-3 left-3">{tourPill}</div>}
        {n > 1 && (
          <div className="absolute bottom-3 right-3">
            <Button data-shot={0} variant="secondary" size="sm" className="gap-2">
              <Grid2x2 size={16} /> {t("showAll", { count: n })}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: single hero + counter. The pill is a sibling of the hero
          rather than a child — a link inside a button is invalid markup. */}
      <div className="sm:hidden relative">
        <button
          data-shot={0}
          className="relative block w-full aspect-[16/9] overflow-hidden bg-secondary focus-ring"
        >
          {fill(0, coverSizes, true)}
          {n > 1 && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-foreground/70 text-background text-xs font-medium px-2.5 py-1.5">
              <ImageIcon size={14} /> 1 / {n}
            </span>
          )}
        </button>
        {tourPill && <div className="absolute bottom-3 left-3">{tourPill}</div>}
      </div>
    </GalleryLightbox>
  );
}
