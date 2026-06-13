import * as React from "react";

/* Inline SVG icon set — stroke: currentColor, no fill.
   Ported from the Danapa design so the exact glyphs are preserved. */

type IconProps = Omit<React.SVGProps<SVGSVGElement>, "stroke"> & {
  size?: number;
  stroke?: number;
};

function Icon({ size = 20, stroke = 2, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Icon>;
export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icon>;
export const IconSun = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const IconMoon = (p: IconProps) => <Icon {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></Icon>;
export const IconBed = (p: IconProps) => <Icon {...p}><path d="M3 18V7M3 12h18a0 0 0 0 1 0 0v6M21 18v-4" /><path d="M3 9.5h6a2 2 0 0 1 2 2V12" /></Icon>;
export const IconBath = (p: IconProps) => <Icon {...p}><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" /><path d="M6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" /><path d="M9 6h2.5" /><path d="M7 21l-1 1M18 21l1 1" /></Icon>;
export const IconArea = (p: IconProps) => <Icon {...p}><path d="M4 4h16v16H4Z" /><path d="M4 9h3M4 14h3M17 4v3M14 4v3" /></Icon>;
export const IconPin = (p: IconProps) => <Icon {...p}><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const IconHeart = (p: IconProps) => <Icon {...p}><path d="M12 20S4 14.5 4 8.8A4.2 4.2 0 0 1 12 6a4.2 4.2 0 0 1 8 2.8C20 14.5 12 20 12 20Z" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconEdit = (p: IconProps) => <Icon {...p}><path d="M14 4 20 10M4 20l1-4L17 4l3 3L8 19l-4 1Z" /></Icon>;
export const IconTrash = (p: IconProps) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>;
export const IconLeft = (p: IconProps) => <Icon {...p}><path d="M15 5 8 12l7 7" /></Icon>;
export const IconRight = (p: IconProps) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="M5 12.5 10 17l9-10" /></Icon>;
export const IconGrid = (p: IconProps) => <Icon {...p}><path d="M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z" /></Icon>;
export const IconList = (p: IconProps) => <Icon {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>;
export const IconUser = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></Icon>;
export const IconLogout = (p: IconProps) => <Icon {...p}><path d="M14 4h5v16h-5" /><path d="M3 12h12M11 8l4 4-4 4" /></Icon>;
export const IconEye = (p: IconProps) => <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const IconEyeOff = (p: IconProps) => <Icon {...p}><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 4M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.2-.9" /></Icon>;
export const IconSliders = (p: IconProps) => <Icon {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></Icon>;
export const IconBuilding = (p: IconProps) => <Icon {...p}><path d="M5 21V4h9v17M14 9h5v12M8 8h2M8 12h2M8 16h2" /></Icon>;
export const IconWifi = (p: IconProps) => <Icon {...p}><path d="M5 12.5a10 10 0 0 1 14 0M8 16a5 5 0 0 1 8 0" /><circle cx="12" cy="19.5" r="1" /></Icon>;
export const IconCar = (p: IconProps) => <Icon {...p}><path d="M5 16v2M19 16v2M3 13l1.5-5h15L21 13v3H3ZM3 13h18" /><circle cx="7.5" cy="16" r="1.5" /><circle cx="16.5" cy="16" r="1.5" /></Icon>;
export const IconPaw = (p: IconProps) => <Icon {...p}><circle cx="8" cy="7" r="1.6" /><circle cx="16" cy="7" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><path d="M12 12c-2.4 0-4 1.8-4 4s1.6 3 4 3 4-1.4 4-3-1.6-4-4-4Z" /></Icon>;
export const IconLeaf = (p: IconProps) => <Icon {...p}><path d="M5 19C5 9 13 5 20 5c0 9-5 14-13 14a8 8 0 0 1-2-.3Z" /><path d="M5 19c2-4 5-6 9-7.5" /></Icon>;
export const IconSnow = (p: IconProps) => <Icon {...p}><path d="M12 2v20M4 6l16 12M20 6 4 18M2 12h20" /></Icon>;
export const IconCheckCircle = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5 11 15l4.5-5" /></Icon>;
export const IconCalendar = (p: IconProps) => <Icon {...p}><path d="M4 6h16v15H4ZM4 10h16M8 3v4M16 3v4" /></Icon>;
export const IconClock = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></Icon>;
export const IconShield = (p: IconProps) => <Icon {...p}><path d="M12 3l7 2.5V11c0 5-3.4 8.3-7 10-3.6-1.7-7-5-7-10V5.5Z" /><path d="M9 12l2 2 4-4.5" /></Icon>;
export const IconMessage = (p: IconProps) => <Icon {...p}><path d="M4 5h16v11H9l-4 3.5V16H4Z" /><path d="M8 9.5h8M8 12.5h5" /></Icon>;
export const IconGlobe = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.4 2.6 15.6 0 18M12 3c-2.6 2.4-2.6 15.6 0 18" /></Icon>;
export const IconMail = (p: IconProps) => <Icon {...p}><path d="M3 6h18v12H3Z" /><path d="m3 7 9 6 9-6" /></Icon>;
export const IconLock = (p: IconProps) => <Icon {...p}><path d="M6 11h12v9H6Z" /><path d="M9 11V8a3 3 0 0 1 6 0v3" /></Icon>;
export const IconArrowLeft = (p: IconProps) => <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>;
export const IconChevronDown = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const IconSettings = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></Icon>;
export const IconSwap = (p: IconProps) => <Icon {...p}><path d="M7 4 3 8l4 4" /><path d="M3 8h13a4 4 0 0 1 4 4" /><path d="M17 20l4-4-4-4" /><path d="M21 16H8a4 4 0 0 1-4-4" /></Icon>;

export const IconStar = ({
  filled = false,
  size = 20,
  stroke = 1.75,
  ...props
}: Omit<React.SVGProps<SVGSVGElement>, "stroke"> & {
  filled?: boolean;
  size?: number;
  stroke?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3.2l2.7 5.46 6.03.88-4.36 4.25 1.03 6L12 17.02 6.57 19.79l1.03-6L3.24 9.54l6.03-.88Z" />
  </svg>
);

/* amenity icon id -> component, for data-driven amenity lists */
export const AMENITY_ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  wifi: IconWifi,
  car: IconCar,
  paw: IconPaw,
  leaf: IconLeaf,
  snow: IconSnow,
  "check-circle": IconCheckCircle,
};

/* brand marks */
export const GoogleMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
export const AppleMark = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);
