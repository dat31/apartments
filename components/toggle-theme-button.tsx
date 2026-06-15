"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ToggleThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun size={20} className="hidden dark:block" />
      <Moon size={20} className="block dark:hidden" />
    </Button>
  );
}
