import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* Shared pieces for the site-wide og-image route, implementing the
   "Dark — typographic" frame from the "Danapa OG Images" Claude Design doc.
   The palette is the doc's oklch tokens pre-converted to hex — the og
   renderer (satori) doesn't parse oklch. It mirrors globals.css .dark. */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_DARK = {
  bg: "#0d130f", // --d-bg
  fg: "#e6e9e3", // --d-fg
  primary: "#61b379", // --d-primary
  primaryFg: "#08120b", // --d-pfg
  muted: "#939b92", // --d-muted
  accent: "#253529", // --d-accent
} as const;

/** The design's pixel tower mark (windows punched into the building body). */
export function TowerMark({ size }: { size: number }) {
  const c = OG_DARK;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={0} y={0} width={100} height={100} fill={c.primary} />
      <rect x={38} y={20} width={24} height={14} fill={c.primaryFg} />
      <rect x={26} y={34} width={48} height={46} fill={c.primaryFg} />
      <g fill={c.primary}>
        <rect x={45} y={24} width={10} height={6} />
        <rect x={33} y={41} width={9} height={9} />
        <rect x={46} y={41} width={9} height={9} />
        <rect x={59} y={41} width={9} height={9} />
        <rect x={33} y={56} width={9} height={9} />
        <rect x={59} y={56} width={9} height={9} />
        <rect x={33} y={71} width={9} height={6} />
        <rect x={59} y={71} width={9} height={6} />
      </g>
    </svg>
  );
}

/** Be Vietnam Pro (the design doc's face, full Vietnamese coverage) in the
    weights the frame uses, ready for ImageResponse's `fonts` option. */
export async function loadOgFonts() {
  const load = (file: string) =>
    readFile(join(process.cwd(), "assets/fonts", file));
  const [regular, medium, semibold] = await Promise.all([
    load("be-vietnam-pro-regular.ttf"),
    load("be-vietnam-pro-medium.ttf"),
    load("be-vietnam-pro-semibold.ttf"),
  ]);
  return [
    { name: "Be Vietnam Pro", data: regular, weight: 400, style: "normal" },
    { name: "Be Vietnam Pro", data: medium, weight: 500, style: "normal" },
    { name: "Be Vietnam Pro", data: semibold, weight: 600, style: "normal" },
  ] as const;
}
