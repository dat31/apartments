/* ============================================================
   The vocabulary services use to refuse.

   Read services throw a plain Error on an unexpected Supabase
   failure — that's a bug, and an error boundary should see it.
   ServiceError is the other kind: an *expected* refusal the UI is
   meant to render, so it carries a machine code instead of a
   message. `lib/actions/result.ts` turns it into the
   `{ ok: false, error }` union the toasts already switch on, and
   the code is translated at the call site (never here — these
   strings are keys, not copy).

   No "server-only": the codes appear in Server Action return
   types, which client components import to narrow on. Same rule
   as the *-map modules — pure data, safe anywhere.
   ============================================================ */

export type ServiceErrorCode =
  /** No session cookie, or it no longer resolves to a user. */
  | "unauthenticated"
  /** Signed in, but not allowed to touch this particular row. */
  | "forbidden"
  /** No such row — or RLS hid it, which reads the same from here. */
  | "not-found"
  /** The payload failed its schema at the trust boundary. */
  | "invalid"
  /** A unique constraint said no (Postgres 23505). */
  | "conflict"
  /* "You can't do this to yourself." Two of them rather than one shared code
     because each has its own sentence in the UI — reviewing your own profile
     and messaging your own listing are refused for different reasons and read
     differently to the person who tried. */
  | "own-profile"
  | "own-listing"
  /** Anything else. The details go to the server log, not the client. */
  | "failed";

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ServiceError";
  }
}
