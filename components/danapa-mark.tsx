import * as React from "react";

type Variant = "tower" | "monogram" | "floors" | "facade";

export function DanapaMark({
  variant = "tower",
  size = 32,
  box = "var(--primary)",
  ink = "var(--primary-foreground)",
  lit = "var(--accent)",
  className = "",
  style = {},
}: {
  variant?: Variant;
  size?: number;
  box?: string;
  ink?: string;
  lit?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const marks: Record<Variant, React.JSX.Element> = {
    tower: (
      <g>
        <rect x="38" y="20" width="24" height="14" fill={ink} />
        <rect x="26" y="34" width="48" height="46" fill={ink} />
        <g fill={box}>
          <rect x="45" y="24" width="10" height="6" />
          <rect x="33" y="41" width="9" height="9" />
          <rect x="46" y="41" width="9" height="9" />
          <rect x="59" y="41" width="9" height="9" />
          <rect x="33" y="56" width="9" height="9" />
          <rect x="59" y="56" width="9" height="9" />
          <rect x="33" y="71" width="9" height="6" />
          <rect x="59" y="71" width="9" height="6" />
        </g>
        <rect x="46" y="56" width="9" height="9" fill={lit} />
      </g>
    ),
    monogram: (
      <g>
        <path d="M24 20 H52 a24 30 0 0 1 0 60 H24 Z M40 33 V67 H50 a13 17 0 0 0 0 -34 Z" fill={ink} fillRule="evenodd" />
        <rect x="29" y="44" width="6" height="12" fill={lit} />
      </g>
    ),
    floors: (
      <g fill={ink}>
        <rect x="22" y="26" width="40" height="9" />
        <rect x="22" y="41" width="56" height="9" />
        <rect x="22" y="56" width="48" height="9" />
        <rect x="22" y="71" width="30" height="9" fill={lit} />
      </g>
    ),
    facade: (
      <g fill={ink}>
        <rect x="26" y="24" width="20" height="22" />
        <rect x="54" y="24" width="20" height="22" />
        <rect x="26" y="54" width="20" height="22" fill={lit} />
        <rect x="54" y="54" width="20" height="22" />
      </g>
    ),
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="100" height="100" fill={box} />
      {marks[variant] || marks.tower}
    </svg>
  );
}
