/* Recently-viewed listing history — a small localStorage ring buffer.

   Deliberately dumber than the saved shortlist: no sign-in, no DB, no sync.
   It's a compare aid for the multi-session apartment hunt (see
   docs/improvements/08-recently-viewed.md), and a feeder for the shortlist,
   not a second one. The precedent is the guest saved list in hooks/use-saved.ts.

   Most-recent id first, deduped, capped. Kept small on purpose. */

export const RECENTLY_VIEWED_KEY = "danapa-recently-viewed";

/** How many ids we retain (and render — the strip scrolls horizontally). */
export const RECENTLY_VIEWED_CAP = 12;

const CHANGE_EVENT = "danapa-recently-viewed-change";

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as string[]) : [];
  } catch {
    return [];
  }
}

export function readRecentlyViewed(): string[] {
  try {
    return parse(localStorage.getItem(RECENTLY_VIEWED_KEY));
  } catch {
    return [];
  }
}

/** Push an id to the front (dedup + cap). Returns the new buffer. No-op on
    storage errors (private mode / SSR), where it returns an empty list. */
export function recordRecentlyViewed(id: string): string[] {
  try {
    const next = [id, ...readRecentlyViewed().filter((x) => x !== id)].slice(
      0,
      RECENTLY_VIEWED_CAP
    );
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    notify();
    return next;
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
    notify();
  } catch {
    // storage unavailable — nothing to clear.
  }
}

/* ---- useSyncExternalStore adapter ----
   Lets the strip read the buffer without a setState-in-effect: a stable
   client snapshot, an empty server snapshot (no history pre-hydration), and a
   subscription that fires on same-tab writes (CHANGE_EVENT) and cross-tab ones
   (the native `storage` event). */

const EMPTY: string[] = [];
let snapshotRaw: string | null = null;
let snapshotValue: string[] = EMPTY;

/** Cached so it returns a stable reference while the stored string is
    unchanged — required by useSyncExternalStore to avoid render loops. */
export function getRecentlyViewedSnapshot(): string[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
  } catch {
    raw = null;
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotValue = parse(raw);
  }
  return snapshotValue;
}

export function getRecentlyViewedServerSnapshot(): string[] {
  return EMPTY;
}

export function subscribeRecentlyViewed(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function notify() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // no window (SSR) — nothing to notify.
  }
}
