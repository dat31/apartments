// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRecentlyViewed,
  getRecentlyViewedServerSnapshot,
  getRecentlyViewedSnapshot,
  readRecentlyViewed,
  RECENTLY_VIEWED_CAP,
  RECENTLY_VIEWED_KEY,
  recordRecentlyViewed,
  subscribeRecentlyViewed,
} from "../recently-viewed";

/* A localStorage ring buffer. Every read path is wrapped in try/catch because
   private-browsing modes throw on access — those branches are the ones worth
   pinning, since they're invisible in normal use. */

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readRecentlyViewed", () => {
  it("returns an empty list when nothing has been stored", () => {
    expect(readRecentlyViewed()).toEqual([]);
  });

  it("reads back what was written", () => {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(["a", "b"]));
    expect(readRecentlyViewed()).toEqual(["a", "b"]);
  });

  it("returns an empty list for corrupt JSON instead of throwing", () => {
    localStorage.setItem(RECENTLY_VIEWED_KEY, "{not json");
    expect(readRecentlyViewed()).toEqual([]);
  });

  it("returns an empty list when the stored value isn't an array", () => {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify({ nope: true }));
    expect(readRecentlyViewed()).toEqual([]);
  });

  it("returns an empty list when storage itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(readRecentlyViewed()).toEqual([]);
  });
});

describe("recordRecentlyViewed", () => {
  it("pushes the id to the front", () => {
    recordRecentlyViewed("a");
    expect(recordRecentlyViewed("b")).toEqual(["b", "a"]);
  });

  it("moves an already-seen id to the front rather than duplicating it", () => {
    recordRecentlyViewed("a");
    recordRecentlyViewed("b");
    expect(recordRecentlyViewed("a")).toEqual(["a", "b"]);
  });

  it("caps the buffer, dropping the oldest id", () => {
    for (let i = 0; i < RECENTLY_VIEWED_CAP + 5; i++) recordRecentlyViewed(`id-${i}`);
    const stored = readRecentlyViewed();
    expect(stored).toHaveLength(RECENTLY_VIEWED_CAP);
    expect(stored[0]).toBe(`id-${RECENTLY_VIEWED_CAP + 4}`);
    expect(stored).not.toContain("id-0");
  });

  it("persists to localStorage", () => {
    recordRecentlyViewed("a");
    expect(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)!)).toEqual(["a"]);
  });

  it("returns an empty list without throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(recordRecentlyViewed("a")).toEqual([]);
  });

  it("notifies subscribers on the same tab", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeRecentlyViewed(onChange);
    onChange.mockClear(); // subscribe fires once on connect by design
    recordRecentlyViewed("a");
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });
});

describe("clearRecentlyViewed", () => {
  it("empties the buffer and notifies", () => {
    recordRecentlyViewed("a");
    const onChange = vi.fn();
    const unsubscribe = subscribeRecentlyViewed(onChange);
    onChange.mockClear();

    clearRecentlyViewed();

    expect(readRecentlyViewed()).toEqual([]);
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });
});

describe("getRecentlyViewedSnapshot", () => {
  it("returns a stable reference while the stored string is unchanged", () => {
    // useSyncExternalStore loops forever if the snapshot identity churns.
    recordRecentlyViewed("a");
    expect(getRecentlyViewedSnapshot()).toBe(getRecentlyViewedSnapshot());
  });

  it("returns a new value once the buffer changes", () => {
    recordRecentlyViewed("a");
    const before = getRecentlyViewedSnapshot();
    recordRecentlyViewed("b");
    const after = getRecentlyViewedSnapshot();
    expect(after).not.toBe(before);
    expect(after).toEqual(["b", "a"]);
  });

  it("gives the server an empty snapshot, since there is no history before hydration", () => {
    recordRecentlyViewed("a");
    expect(getRecentlyViewedServerSnapshot()).toEqual([]);
  });
});

describe("subscribeRecentlyViewed", () => {
  it("fires once on connect, to pick up writes made while disconnected", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeRecentlyViewed(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("responds to cross-tab storage events", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeRecentlyViewed(onChange);
    onChange.mockClear();
    window.dispatchEvent(new Event("storage"));
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("detaches both listeners on unsubscribe", () => {
    const onChange = vi.fn();
    subscribeRecentlyViewed(onChange)();
    onChange.mockClear();
    window.dispatchEvent(new Event("storage"));
    recordRecentlyViewed("a");
    expect(onChange).not.toHaveBeenCalled();
  });
});
