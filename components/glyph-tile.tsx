import * as React from "react";

/* Blocky glyph tiles for the 404 / error pages — same visual language
   as the Danapa mark. */
const GLYPH_GRIDS: Record<string, string[]> = {
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "0": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
};

export function GlyphTile({
  glyph,
  size = 120,
  box = "var(--primary)",
  ink = "var(--primary-foreground)",
  lit,
  litCell,
}: {
  glyph: string;
  size?: number;
  box?: string;
  ink?: string;
  lit?: string;
  litCell?: [number, number];
}) {
  const grid = GLYPH_GRIDS[glyph] || GLYPH_GRIDS["0"];
  const cell = 12;
  const ox = (100 - 5 * cell) / 2;
  const oy = (100 - 7 * cell) / 2;
  const rects: React.JSX.Element[] = [];
  grid.forEach((row, r) => {
    row.split("").forEach((ch, c) => {
      if (ch !== "#") return;
      const isLit = !!lit && !!litCell && litCell[0] === r && litCell[1] === c;
      rects.push(
        <rect
          key={r + "-" + c}
          x={ox + c * cell + 0.7}
          y={oy + r * cell + 0.7}
          width={cell - 1.4}
          height={cell - 1.4}
          fill={isLit ? lit : ink}
        />
      );
    });
  });
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="100" height="100" fill={box} />
      {rects}
    </svg>
  );
}
