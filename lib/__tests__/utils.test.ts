import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/* The class merger every component funnels through. Its job is to let a
   caller's className win over a component's default, which plain
   concatenation would not do. */

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("accepts conditional objects and arrays", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("lets the later Tailwind class win within the same property group", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-muted-foreground", "text-lg")).toBe(
      "text-muted-foreground text-lg"
    );
  });

  it("keeps classes from different property groups", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
