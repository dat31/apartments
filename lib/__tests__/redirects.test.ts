import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/redirects";

/* This is a security boundary: the `next` param in the auth flow is
   attacker-controllable, so anything that could bounce a signed-in user to
   another origin has to fall back. */

describe("safeInternalPath", () => {
  it("accepts an ordinary same-origin path", () => {
    expect(safeInternalPath("/apartments", "/fallback")).toBe("/apartments");
    expect(safeInternalPath("/apartments/saved?sort=low", "/fallback")).toBe(
      "/apartments/saved?sort=low"
    );
  });

  it("rejects a protocol-relative URL", () => {
    // "//evil.com" is a valid absolute URL to the browser.
    expect(safeInternalPath("//evil.com", "/fallback")).toBe("/fallback");
    expect(safeInternalPath("//evil.com/path", "/fallback")).toBe("/fallback");
  });

  it("rejects the backslash variant browsers normalise to //", () => {
    expect(safeInternalPath("/\\evil.com", "/fallback")).toBe("/fallback");
  });

  it("rejects an absolute URL", () => {
    expect(safeInternalPath("https://evil.com", "/fallback")).toBe("/fallback");
    expect(safeInternalPath("http://evil.com", "/fallback")).toBe("/fallback");
    expect(safeInternalPath("javascript:alert(1)", "/fallback")).toBe("/fallback");
  });

  it("rejects a relative path that isn't slash-rooted", () => {
    expect(safeInternalPath("apartments", "/fallback")).toBe("/fallback");
  });

  it("falls back on empty, null and undefined", () => {
    expect(safeInternalPath("", "/fallback")).toBe("/fallback");
    expect(safeInternalPath(null, "/fallback")).toBe("/fallback");
    expect(safeInternalPath(undefined, "/fallback")).toBe("/fallback");
  });
});
