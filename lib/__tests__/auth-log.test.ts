import { afterEach, describe, expect, it, vi } from "vitest";
import { logAuthError } from "@/lib/auth-log";

afterEach(() => vi.restoreAllMocks());

const spyConsole = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("logAuthError", () => {
  it("emits a single greppable line tagged with the operation", () => {
    const spy = spyConsole();
    logAuthError("signIn", {}, new Error("Invalid login credentials"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("[auth:signIn] Invalid login credentials");
  });

  it("stringifies a thrown non-Error", () => {
    const spy = spyConsole();
    logAuthError("signUp", {}, "something went wrong");
    expect(spy.mock.calls[0][0]).toBe("[auth:signUp] something went wrong");
  });

  it("handles a thrown null or undefined without crashing the flow", () => {
    const spy = spyConsole();
    expect(() => logAuthError("reset", {}, null)).not.toThrow();
    expect(spy.mock.calls[0][0]).toBe("[auth:reset] null");
  });

  it("passes the context through alongside the raw error", () => {
    const spy = spyConsole();
    const error = new Error("boom");
    logAuthError("signIn", { email: "renter@example.com" }, error);
    expect(spy.mock.calls[0][1]).toEqual({ email: "renter@example.com", error });
  });
});
