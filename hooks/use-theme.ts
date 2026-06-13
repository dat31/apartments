"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "danapa-theme";

/* Reads / toggles the `.dark` class on <html>, persisted to localStorage.
   A blocking script in app/layout.tsx applies the stored theme before paint. */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync from the DOM class applied by the blocking script in layout.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const apply = useCallback((next: "light" | "dark") => {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }, []);

  const toggleTheme = useCallback(
    () => apply(theme === "dark" ? "light" : "dark"),
    [theme, apply]
  );

  return { theme, toggleTheme };
}
