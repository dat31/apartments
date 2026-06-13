"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "danapa-saved";

/* Persisted shortlist of saved listing ids. */
export function useSaved() {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate the shortlist from localStorage after mount (avoids SSR mismatch).
    try {
      const s = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s) setSaved(JSON.parse(s));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {}
  }, [saved, ready]);

  const toggleSave = useCallback((id: string) => {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  return { saved, toggleSave, isSaved, ready };
}
