import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Grid2x2, Image as ImageIcon } from "lucide-react";
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
}: {
  images?: string[];
  colors: string[];
  label: string;
}) {
  const t = useTranslations("detail.gallery");
  const shots = images?.length ? images : colors;
  const hasPhotos = Boolean(images?.length);
  const n = shots.length;

  const fill = (i: number, sizes: string) =>
    hasPhotos ? (
      <Image
        src={shots[i]}
        alt={label}
        fill
        sizes={sizes}
        className="object-cover"
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
    { more = 0, frame = "aspect-[16/9]" }: { more?: number; frame?: string } = {},
  ) => (
    <button
      key={i}
      data-shot={i}
      className={`group relative w-full overflow-hidden bg-secondary focus-ring ${frame}`}
    >
      {fill(i, sizes)}
      <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-background text-xl font-semibold">
          +{more}
        </span>
      )}
    </button>
  );

  return (
    <GalleryLightbox shots={shots} hasPhotos={hasPhotos} label={label}>
      {/* Desktop: 16:9 mosaic — cover + stacked companions, each a true 16:9 tile */}
      <div className="relative hidden sm:block">
        {n === 1 ? (
          tile(0, "100vw")
        ) : n === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            {tile(0, "50vw")}
            {tile(1, "50vw")}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 items-stretch">
            <div className="col-span-2 flex">
              {tile(0, "(min-width: 640px) 66vw, 100vw", { frame: "h-full" })}
            </div>
            <div className="flex flex-col gap-2">
              {tile(1, "33vw")}
              {tile(2, "33vw", { more: n > 3 ? n - 3 : 0 })}
            </div>
          </div>
        )}
        {n > 1 && (
          <div className="absolute bottom-3 right-3">
            <Button data-shot={0} variant="secondary" size="sm" className="gap-2">
              <Grid2x2 size={16} /> {t("showAll", { count: n })}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: single hero + counter */}
      <button
        data-shot={0}
        className="sm:hidden relative block w-full aspect-[16/9] overflow-hidden bg-secondary focus-ring"
      >
        {fill(0, "100vw")}
        {n > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-foreground/70 text-background text-xs font-medium px-2.5 py-1.5">
            <ImageIcon size={14} /> 1 / {n}
          </span>
        )}
      </button>
    </GalleryLightbox>
  );
}
