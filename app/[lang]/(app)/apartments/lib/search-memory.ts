/* Key under which the apartments listing query string (filters/sort/page) is
   remembered in sessionStorage, so the detail page's "Back to results" link can
   return the user to the exact list they came from. */
export const SEARCH_MEMORY_KEY = "apartments:lastSearch";

/* Key under which a listing-card click stamps a timestamp, so the detail page
   can tell "the previous history entry is the results list" apart from deep
   links, refreshes, and stale journeys. */
const CAME_FROM_RESULTS_KEY = "apartments:cameFromResults";

/* A click → detail-mount hop is at most a few seconds; anything older is a
   leftover from an earlier journey and must not trigger history.back(). */
const CAME_FROM_RESULTS_MAX_AGE_MS = 30_000;

/** Stamp "the user is leaving a results list for a detail page" — call from a
    listing-card click, right before navigation. */
export function markCameFromResults() {
  try {
    sessionStorage.setItem(CAME_FROM_RESULTS_KEY, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable (private mode) — non-critical.
  }
}

/** True while the detail page is mounting right after a card click, meaning
    history.back() lands on the list the user just left. */
export function cameFromResults(): boolean {
  try {
    const ts = Number(sessionStorage.getItem(CAME_FROM_RESULTS_KEY));
    return ts > 0 && Date.now() - ts < CAME_FROM_RESULTS_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/** Consume the marker once a back-navigation has used it, so it can't leak
    into a later, unrelated journey. */
export function clearCameFromResults() {
  try {
    sessionStorage.removeItem(CAME_FROM_RESULTS_KEY);
  } catch {
    // ignore
  }
}
