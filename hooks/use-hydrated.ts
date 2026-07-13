"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** False on the server and for the hydration render, true afterwards.
    Replaces the setMounted-in-an-effect gate (which the React Compiler lint
    rejects) for UI that depends on client-only state such as auth. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
