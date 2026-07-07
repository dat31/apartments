export type LandingStat = {
  value: number;
  suffix: string;
  /** Message key under `landing.stats`. */
  labelKey: "apartments" | "renters" | "hosts" | "districts";
};

/** Platform stats shown beside the welcome in the split hero.
 *  Numbers are illustrative for the demo; they count up gently on load. */
export const LANDING_STATS: LandingStat[] = [
  { value: 1240, suffix: "+", labelKey: "apartments" },
  { value: 9400, suffix: "+", labelKey: "renters" },
  { value: 280, suffix: "+", labelKey: "hosts" },
  { value: 14, suffix: "", labelKey: "districts" },
];
