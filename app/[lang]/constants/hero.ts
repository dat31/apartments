export type HeroStep = {
  id: number;
  dot: string;
};

/** The three stages of the renter journey shown in the animated phone mockup.
 *  Display text lives in messages under `landing.hero`. */
export const HERO_STEPS: HeroStep[] = [
  { id: 0, dot: "bg-primary" },
  { id: 1, dot: "bg-chart-2" },
  { id: 2, dot: "bg-chart-3" },
];

/** Time each step stays on screen before auto-advancing (ms). Keep in sync with `.hero-progress` in globals.css. */
export const HERO_STEP_DURATION = 4000;
