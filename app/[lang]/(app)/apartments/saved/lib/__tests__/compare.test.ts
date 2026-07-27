import { describe, expect, it } from "vitest";
import { COMPARE_MAX, parseCompareIds } from "../compare";
import { testId } from "@/tests/factories";

/* The `ids` param is hand-editable and feeds straight into a Supabase
   `.in("id", …)` against a uuid column, so anything that isn't a uuid has to
   be dropped rather than passed through and raised as a database error. */

describe("parseCompareIds", () => {
  const a = testId(1);
  const b = testId(2);
  const c = testId(3);

  it("returns an empty list for null or an empty string", () => {
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
  });

  it("parses a comma-separated list of uuids", () => {
    expect(parseCompareIds(`${a},${b}`)).toEqual([a, b]);
  });

  it("tolerates whitespace around each id", () => {
    expect(parseCompareIds(` ${a} , ${b} `)).toEqual([a, b]);
  });

  it("drops anything that isn't a uuid", () => {
    expect(parseCompareIds(`${a},not-a-uuid,l1,${b}`)).toEqual([a, b]);
    expect(parseCompareIds("garbage,123")).toEqual([]);
  });

  it("drops a uuid with a stray character appended", () => {
    expect(parseCompareIds(`${a}x`)).toEqual([]);
  });

  it("accepts uppercase uuids", () => {
    expect(parseCompareIds(a.toUpperCase())).toEqual([a.toUpperCase()]);
  });

  it("deduplicates, keeping first appearance order", () => {
    expect(parseCompareIds(`${b},${a},${b}`)).toEqual([b, a]);
  });

  it("caps the list at COMPARE_MAX", () => {
    const many = Array.from({ length: 10 }, (_, i) => testId(100 + i)).join(",");
    expect(parseCompareIds(many)).toHaveLength(COMPARE_MAX);
  });

  it("deduplicates before capping, so repeats don't waste a column", () => {
    const ids = parseCompareIds([a, a, b, c].join(","));
    expect(ids).toEqual([a, b, c]);
  });

  it("caps at a width the compare table can actually render", () => {
    expect(COMPARE_MAX).toBeGreaterThan(1);
    expect(COMPARE_MAX).toBeLessThanOrEqual(4);
  });
});
