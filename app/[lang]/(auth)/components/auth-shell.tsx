"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { BrandPanel } from "./brand-panel";

/* Brand panel + centered form column. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <BrandPanel />
      <section className="relative flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-6 sm:px-10 h-20">
          <span className="lg:hidden">
            <Logo size={22} />
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 ml-auto"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-14">
          <div className="w-full max-w-[400px] anim-up">{children}</div>
        </div>
      </section>
    </div>
  );
}
