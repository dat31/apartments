import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware drop-ins for Next.js navigation APIs. These automatically add
// the locale prefix (per the "as-needed" strategy) so call sites use plain
// hrefs like "/apartments".
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
