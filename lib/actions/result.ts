import { unstable_rethrow } from "next/navigation";
import { ServiceError, type ServiceErrorCode } from "@/lib/services/errors";

/* ============================================================
   The bridge between a service that throws and an action that
   returns.

   Expected failures are return values, not exceptions — the
   Next.js error-handling guide is explicit about it, and the
   existing callers (write-review-button, message-owner-button)
   already switch on `result.error` to pick a toast. This keeps
   that union while letting services refuse with a `throw`, so a
   guard clause deep in a service can't be forgotten by the
   action that wraps it.

   No "server-only", for the same reason the *-map modules have
   none: `unwrap` runs in the browser, inside react-query. The
   modules that hold secrets are the services; this one holds a
   type and two adapters.

   Not a "use server" module either — neither export is a valid
   Server Action. It is imported *by* those modules.
   ============================================================ */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceErrorCode };

/**
 * Server side: run a service call and translate its refusal.
 *
 * Anything that isn't a ServiceError is a bug, so it's logged server-side and
 * flattened to "failed" — the client never sees a Postgres message, a column
 * name, or a stack.
 */
export async function toResult<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // redirect() and notFound() signal by throwing; swallowing them here would
    // turn a navigation into a silent "failed".
    unstable_rethrow(error);

    if (error instanceof ServiceError) {
      return { ok: false, error: error.code };
    }
    console.error("[action] unhandled service failure", error);
    return { ok: false, error: "failed" };
  }
}

/**
 * Client side: react-query signals failure by throwing, so turn the union back
 * into one. The code survives on the ServiceError, which is what an `onError`
 * handler narrows to choose its toast.
 */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new ServiceError(result.error);
  return result.data;
}
