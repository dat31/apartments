"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Grid2x2, Image as ImageIcon, X } from "lucide-react";

/* Photo gallery: editorial mosaic on desktop, single hero on mobile, both
   opening a fullscreen lightbox carousel with a synced thumbnail rail.
   Renders real photos when `images` are present, falling back to the
   cover-color blocks otherwise. */
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
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState(0);

  const openAt = (i: number) => {
    setStart(i);
    setOpen(true);
  };

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

  /* Grid spans: a dominant cover photo + smaller companions. */
  const spanFor = (i: number) => {
    if (n === 1) return "col-span-4 row-span-2";
    if (n === 2) return i === 0 ? "col-span-3 row-span-2" : "col-span-1 row-span-2";
    return i === 0 ? "col-span-3 row-span-2" : "col-span-1 row-span-1";
  };
  const tileCount = n >= 3 ? 3 : n;

  return (
    <>
      {/* Desktop: editorial mosaic */}
      <div className="relative hidden sm:block">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 aspect-[16/9]">
          {Array.from({ length: tileCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => openAt(i)}
              className={cn(
                "group relative overflow-hidden bg-secondary focus-ring",
                spanFor(i)
              )}
            >
              {fill(i, i === 0 ? "(min-width: 768px) 75vw, 75vw" : "25vw")}
              <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
              {n > 3 && i === 2 && (
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-background text-xl font-semibold">
                  +{n - 3}
                </span>
              )}
            </button>
          ))}
        </div>
        {n > 1 && (
          <div className="absolute bottom-3 right-3">
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => openAt(0)}>
              <Grid2x2 size={16} /> {t("showAll", { count: n })}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: single hero + counter */}
      <button
        onClick={() => openAt(0)}
        className="sm:hidden relative block w-full aspect-[16/9] overflow-hidden bg-secondary focus-ring"
      >
        {fill(0, "100vw")}
        {n > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-foreground/70 text-background text-xs font-medium px-2.5 py-1.5">
            <ImageIcon size={14} /> 1 / {n}
          </span>
        )}
      </button>

      {open && (
        <Lightbox
          shots={shots}
          hasPhotos={hasPhotos}
          label={label}
          start={start}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Lightbox({
  shots,
  hasPhotos,
  label,
  start,
  onClose,
}: {
  shots: string[];
  hasPhotos: boolean;
  label: string;
  start: number;
  onClose: () => void;
}) {
  const t = useTranslations("detail.gallery");
  const n = shots.length;
  const [api, setApi] = React.useState<CarouselApi>();
  const [active, setActive] = React.useState(start);
  const railRef = React.useRef<HTMLDivElement>(null);

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

  /* Sync the active index from the carousel. */
  React.useEffect(() => {
    if (!api) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(api.selectedScrollSnap());
    const onSelect = () => setActive(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  /* Escape to close + scroll-lock while the lightbox is open. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* Keep the active thumbnail centered in the rail. */
  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const thumb = rail.children[active] as HTMLElement | undefined;
    if (!thumb) return;
    rail.scrollTo({
      left: thumb.offsetLeft - rail.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: "smooth",
    });
  }, [active]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 anim-fade"
      onMouseDown={onClose}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 h-16 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium tabular-nums text-white/80">
          {active + 1} / {n}
        </span>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="inline-flex items-center justify-center w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 relative flex items-center justify-center px-4 sm:px-20"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Carousel
          className="w-full max-w-5xl"
          opts={{ startIndex: start, loop: n > 1 }}
          setApi={setApi}
        >
          <CarouselContent>
            {shots.map((_, i) => (
              <CarouselItem key={i}>
                <div className="aspect-video relative overflow-hidden bg-black">
                  {fill(i, "(min-width: 640px) 80vw, 100vw")}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {n > 1 && (
            <>
              <CarouselPrevious className="-left-3 sm:-left-16 size-11 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
              <CarouselNext className="-right-3 sm:-right-16 size-11 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
            </>
          )}
        </Carousel>
      </div>

      {n > 1 && (
        <div
          ref={railRef}
          onMouseDown={(e) => e.stopPropagation()}
          className="shrink-0 flex gap-2 overflow-x-auto px-4 sm:px-6 py-4"
        >
          {shots.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              aria-label={t("photo", { n: i + 1 })}
              className={cn(
                "relative shrink-0 w-20 h-14 overflow-hidden transition-all focus-ring",
                active === i ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"
              )}
            >
              {fill(i, "80px")}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
