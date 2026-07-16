"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { X } from "lucide-react";

/* Fullscreen photo carousel with a synced thumbnail rail. Split out of the
   gallery so embla (its heaviest dependency) is code-split and only fetched
   when a photo is actually opened. */
export function Lightbox({
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
