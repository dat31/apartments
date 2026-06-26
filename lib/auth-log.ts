/* Lightweight error logging for the auth flow. Emits a single greppable line —
   `[auth:<operation>] <message>` — plus a context object (email, redirect link,
   etc.) and the raw error, so failures are easy to trace in the console.
   Never pass secrets here (OTP tokens, passwords) — only non-sensitive context. */
export function logAuthError(
  operation: string,
  context: Record<string, unknown>,
  error: unknown
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[auth:${operation}] ${message}`, { ...context, error });
}
