// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cameFromResults,
  clearCameFromResults,
  markCameFromResults,
  SEARCH_MEMORY_KEY,
} from "../search-memory";

/* The marker tells the detail page whether history.back() lands on the
   results list. It has to expire: a stale marker from an earlier journey
   would send the user somewhere unrelated. */

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("cameFromResults", () => {
  it("is false before any card click", () => {
    expect(cameFromResults()).toBe(false);
  });

  it("is true immediately after a card click", () => {
    markCameFromResults();
    expect(cameFromResults()).toBe(true);
  });

  it("stays true within the freshness window", () => {
    markCameFromResults();
    vi.advanceTimersByTime(29_000);
    expect(cameFromResults()).toBe(true);
  });

  it("expires once the window has passed", () => {
    // A leftover from an earlier journey must not trigger history.back().
    markCameFromResults();
    vi.advanceTimersByTime(31_000);
    expect(cameFromResults()).toBe(false);
  });

  it("is false for a non-numeric or zero marker", () => {
    sessionStorage.setItem("apartments:cameFromResults", "not-a-number");
    expect(cameFromResults()).toBe(false);
    sessionStorage.setItem("apartments:cameFromResults", "0");
    expect(cameFromResults()).toBe(false);
  });

  it("is false when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(cameFromResults()).toBe(false);
  });
});

describe("clearCameFromResults", () => {
  it("consumes the marker so it can't be reused", () => {
    markCameFromResults();
    clearCameFromResults();
    expect(cameFromResults()).toBe(false);
  });

  it("is safe to call when no marker is set", () => {
    expect(() => clearCameFromResults()).not.toThrow();
  });
});

describe("markCameFromResults", () => {
  it("swallows storage errors rather than breaking the navigation", () => {
    // The click must still navigate even in private mode.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(() => markCameFromResults()).not.toThrow();
  });

  it("refreshes the timestamp on a second click", () => {
    markCameFromResults();
    vi.advanceTimersByTime(29_000);
    markCameFromResults();
    vi.advanceTimersByTime(10_000);
    // 39s since the first click, but only 10s since the second.
    expect(cameFromResults()).toBe(true);
  });
});

describe("SEARCH_MEMORY_KEY", () => {
  it("is namespaced, so it can't collide with another feature's key", () => {
    expect(SEARCH_MEMORY_KEY).toContain(":");
  });
});
