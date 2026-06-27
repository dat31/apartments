"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { HERO_STEPS, HERO_STEP_DURATION } from "@/app/[lang]/constants/hero";

// Message-key prefix per step (order matches HERO_STEPS).
const STEP_KEYS = ["browse", "details", "tour"] as const;

// ─── Wireframe slides (flat blocks driven by theme tokens) ───────────────────

const SLIDES = [
  // 0 — Browse
  <div key="browse" className="p-2.5">
    <div className="w-3/5 h-[7px] bg-primary mb-[7px]" />
    <div className="flex gap-[5px] mb-2">
      <div className="flex-1 h-6 bg-muted" />
      <div className="w-6 h-6 bg-primary shrink-0" />
    </div>
    <div className="grid grid-cols-2 gap-[5px]">
      {[false, true, false, false].map((accent, i) => (
        <div
          key={i}
          className={cn(
            "h-[72px] p-[7px] border",
            accent ? "border-primary/40 bg-accent" : "border-border bg-muted"
          )}
        >
          <div
            className={cn(
              "w-[70%] h-[6px] mb-[5px]",
              accent ? "bg-primary" : "bg-border"
            )}
          />
          <div className="w-1/2 h-[5px] bg-border mb-1" />
          <div className="w-[65%] h-[5px] bg-border" />
        </div>
      ))}
    </div>
    <div className="w-[45%] h-[6px] bg-border mt-[9px]" />
  </div>,

  // 1 — View details
  <div key="details" className="p-2.5">
    <div className="relative h-[110px] bg-muted border border-border mb-[9px] overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-3 gap-[2px] opacity-40">
        {[0, 1, 2].map((i) => (
          <div key={i} className={i === 1 ? "bg-foreground/20" : "bg-border"} />
        ))}
      </div>
      <div className="absolute bottom-[7px] left-[7px] flex gap-1">
        <div className="h-3 w-[38px] bg-accent" />
        <div className="h-3 w-[28px] bg-chart-3" />
      </div>
    </div>
    <div className="w-[70%] h-[7px] bg-primary mb-[5px]" />
    <div className="w-[45%] h-[5px] bg-border mb-2.5" />
    <div className="flex gap-[5px] mb-[9px]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1 h-[38px] border border-border bg-muted" />
      ))}
    </div>
    <div className="h-[5px] bg-border mb-1" />
    <div className="w-4/5 h-[5px] bg-border mb-[11px]" />
    <div className="h-[26px] bg-primary w-full" />
  </div>,

  // 2 — Book tour
  <div key="tour" className="p-2.5">
    <div className="w-[55%] h-[7px] bg-primary mb-[5px]" />
    <div className="w-[38%] h-[5px] bg-border mb-3" />
    <div className="grid grid-cols-7 gap-[3px] mb-2.5">
      {[
        "gray", "gray", "gray", "purple", "purple", "active", "gray",
        "gray", "purple", "gray", "gray", "gray", "gray", "gray",
      ].map((c, i) => (
        <div
          key={i}
          className={cn(
            "h-4",
            c === "active"
              ? "bg-primary"
              : c === "purple"
                ? "bg-accent"
                : "bg-muted border border-border"
          )}
        />
      ))}
    </div>
    <div className="w-[55%] h-[5px] bg-border mb-2" />
    <div className="flex gap-[5px] mb-2.5">
      {[true, false, true].map((acc, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 h-7",
            acc ? "bg-accent" : "bg-muted border border-border"
          )}
        />
      ))}
    </div>
    <div className="h-9 bg-muted border border-border mb-[9px]" />
    <div className="h-[26px] bg-primary w-full" />
  </div>,
];

// ─── Floating pill positions per step ────────────────────────────────────────

const PILL_POS = [
  "top-7 -right-2",
  "bottom-[72px] -right-3",
  "bottom-[52px] -left-4",
];

export function HeroSection() {
  const [step, setStep] = React.useState(0);

  // Auto-advance: re-armed whenever `step` changes (auto or via click).
  React.useEffect(() => {
    const t = setTimeout(
      () => setStep((s) => (s + 1) % HERO_STEPS.length),
      HERO_STEP_DURATION
    );
    return () => clearTimeout(t);
  }, [step]);

  const t = useTranslations("landing.hero");

  return (
    <div className="relative isolate overflow-hidden flex flex-col justify-center w-full px-6 py-10 sm:px-10 sm:py-12 lg:py-16">
      {/* Grid backdrop */}
      <div className="hero-grid absolute inset-0 -z-10 pointer-events-none" />


      {/* Phone mockup */}
      <div className="relative mt-8 sm:mt-10 flex justify-center">
        <div className="relative h-[400px] w-[210px] sm:h-[420px] sm:w-[220px]">
          {/* Floating pill */}
          <div
            key={step}
            className={cn(
              "anim-fade absolute z-20 flex items-center gap-2 whitespace-nowrap bg-popover text-popover-foreground border border-border px-3 py-1.5 text-xs",
              PILL_POS[step]
            )}
          >
            <span className={cn("size-[7px] shrink-0", HERO_STEPS[step].dot)} />
            <span className="leading-tight">
              <strong className="block font-medium text-foreground">
                {t(`${STEP_KEYS[step]}Title`)}
              </strong>
              <span className="text-muted-foreground">
                {t(`${STEP_KEYS[step]}Sub`)}
              </span>
            </span>
          </div>

          {/* Phone frame */}
          <div className="absolute left-1/2 top-1/2 z-10 h-[372px] w-[192px] sm:h-[390px] sm:w-[200px] -translate-x-1/2 -translate-y-1/2 overflow-hidden border-2 border-border bg-card">
            {/* Notch */}
            <div className="mx-auto h-3.5 w-14 bg-muted" />

            {/* Screen */}
            <div className="relative h-[calc(100%-0.875rem)] overflow-hidden">
              {SLIDES.map((slide, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 transition-all duration-400 ease-out",
                    step === i
                      ? "opacity-100 translate-y-0 scale-100"
                      : "pointer-events-none opacity-0 translate-y-3 scale-[0.97]"
                  )}
                >
                  {slide}
                </div>
              ))}

              {/* In-phone step dots */}
              <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
                {HERO_STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={cn(
                      "size-1 transition-colors",
                      step === i ? "bg-primary" : "bg-border"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step navigation */}
      <div className="relative mt-8 sm:mt-10 flex items-center justify-center gap-3 lg:justify-start">
        {HERO_STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <span className="h-4 w-px bg-border" />}
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 transition-opacity focus-ring",
                step === i ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              <span
                className={cn(
                  "size-[7px] shrink-0 transition-colors",
                  step === i ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap text-xs",
                  step === i ? "font-medium" : "font-normal"
                )}
              >
                {t(`${STEP_KEYS[i]}Label`)}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative mt-3 h-0.5 w-full max-w-[280px] mx-auto lg:mx-0 overflow-hidden bg-border/60">
        <div key={step} className="hero-progress h-full bg-primary" />
      </div>
    </div>
  );
}
