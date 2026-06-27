"use client";

import NextLink from "next/link";
import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { localizeHref, useLocale } from "./navigation";

type NextLinkProps = ComponentProps<typeof NextLink>;

// Drop-in replacement for next/link that prefixes the active locale onto
// string hrefs. Object hrefs and external/anchor links pass through unchanged,
// so existing `href="/apartments"` call sites need no edits beyond the import.
export const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(
  function Link({ href, ...props }, ref) {
    const locale = useLocale();
    const localized = typeof href === "string" ? localizeHref(href, locale) : href;
    return <NextLink ref={ref} href={localized} {...props} />;
  }
);
