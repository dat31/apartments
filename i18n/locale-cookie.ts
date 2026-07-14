/** Persists the visitor's locale choice; next-intl in the proxy reads
    NEXT_LOCALE to pick a locale for unprefixed visits. Kept out of component
    scope because assigning document.cookie inside a component trips the
    React Compiler's global-mutation lint. */
export function rememberLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}
