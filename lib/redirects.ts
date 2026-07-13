/** Constrain a redirect target taken from user-controlled input (e.g. the
    `next` query param in auth flows) to a same-origin path. Anything that is
    not a single-slash-rooted path — absolute URLs, protocol-relative
    "//host", backslash variants — falls back, so a crafted link can never
    bounce a signed-in user to another origin. */
export function safeInternalPath(
  path: string | null | undefined,
  fallback: string
): string {
  return path && /^\/(?![/\\])/.test(path) ? path : fallback;
}
