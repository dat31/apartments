import { describe, expect, it } from "vitest";
import { savedListingsKeys, savedSignature } from "../saved-listings-keys";
import { parseFilters, parseSort } from "@/app/[lang]/(app)/apartments/lib/query";
import { testId } from "@/tests/factories";

/* The saved-id set is a queryFn *input* — it scopes the DB read via
   `.in("id", …)`. It used to be left out of the query key on purpose, which let
   a cached page outlive the shortlist it was built from (a background refetch of
   the shortlist, the guest->member merge, or another tab would all leave the
   Saved page rendering results for ids the user no longer has, with nothing to
   trigger a correction). These tests pin the two properties that fix relies on:
   the signature moves when the set does, and it doesn't move when it doesn't. */

describe("savedSignature", () => {
  const a = testId(1);
  const b = testId(2);
  const c = testId(3);

  it("is stable across re-orderings of the same set", () => {
    // The shortlist comes back ordered by created_at, so the same set can
    // arrive in a different order — that must not re-key.
    expect(savedSignature([a, b, c])).toBe(savedSignature([c, a, b]));
  });

  it("changes when an id is added", () => {
    expect(savedSignature([a, b])).not.toBe(savedSignature([a, b, c]));
  });

  it("changes when an id is removed", () => {
    expect(savedSignature([a, b, c])).not.toBe(savedSignature([a, c]));
  });

  it("does not mutate the array it is given", () => {
    const saved = [c, a, b];
    savedSignature(saved);
    expect(saved).toEqual([c, a, b]);
  });

  it("handles the empty shortlist", () => {
    expect(savedSignature([])).toBe("");
  });
});

describe("savedListingsKeys", () => {
  const filters = parseFilters({});
  const sort = parseSort({});
  const a = testId(1);
  const b = testId(2);

  it("re-keys the page query when the saved set changes", () => {
    const before = savedListingsKeys.page(
      "user-1",
      savedSignature([a, b]),
      filters,
      sort,
      1
    );
    const after = savedListingsKeys.page(
      "user-1",
      savedSignature([a]),
      filters,
      sort,
      1
    );
    expect(before).not.toEqual(after);
  });

  it("re-keys the facets query when the saved set changes", () => {
    expect(savedListingsKeys.facets("user-1", savedSignature([a, b]))).not.toEqual(
      savedListingsKeys.facets("user-1", savedSignature([a]))
    );
  });

  it("keeps both keys under the prefixes useSaved patches and invalidates", () => {
    expect(
      savedListingsKeys
        .page("user-1", savedSignature([a]), filters, sort, 1)
        .slice(0, savedListingsKeys.pages.length)
    ).toEqual([...savedListingsKeys.pages]);
    expect(
      savedListingsKeys
        .facets("user-1", savedSignature([a]))
        .slice(0, savedListingsKeys.facetsAll.length)
    ).toEqual([...savedListingsKeys.facetsAll]);
  });
});
