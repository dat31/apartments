export type HeroStep = {
  id: number;
  label: string;
  pill: { dot: string; title: string; sub: string };
};

/** The three stages of the renter journey shown in the animated phone mockup. */
export const HERO_STEPS: HeroStep[] = [
  {
    id: 0,
    label: "Browse",
    pill: { dot: "bg-primary", title: "47 listings", sub: "Mỹ Khê · Sơn Trà" },
  },
  {
    id: 1,
    label: "View details",
    pill: { dot: "bg-chart-2", title: "4.8 ★", sub: "₫ 8.5M / month" },
  },
  {
    id: 2,
    label: "Book tour",
    pill: { dot: "bg-chart-3", title: "Tour confirmed", sub: "Thu, Jun 26 · 10AM" },
  },
];

/** Time each step stays on screen before auto-advancing (ms). Keep in sync with `.hero-progress` in globals.css. */
export const HERO_STEP_DURATION = 4000;
