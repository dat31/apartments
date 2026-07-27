import { test, expect, localePath } from "./fixtures";

/* next-intl runs with localePrefix "as-needed" (i18n/routing.ts): the default
   locale `vi` is served on clean URLs, `en` is prefixed. These assertions pin
   that contract, which proxy.ts and lib/supabase/middleware.ts both depend on. */
test.describe("locale routing", () => {
  test("serves the default locale unprefixed", async ({ page }) => {
    await page.goto("/apartments");

    await expect(page).toHaveURL(/\/apartments(\?|$)/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("serves English on the /en prefix", async ({ page }) => {
    await page.goto("/en/apartments");

    await expect(page).toHaveURL(/\/en\/apartments(\?|$)/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("redirects the redundant default-locale prefix", async ({ page }) => {
    await page.goto("/vi/apartments");

    // "as-needed" never serves the default locale under its prefix.
    await expect(page).toHaveURL(/\/apartments(\?|$)/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("the language switcher hard-navigates and remembers the choice", async ({
    page,
  }) => {
    await page.goto("/apartments");

    // Selected by its aria-label because the trigger's text is just the locale
    // code; note that other header buttons also carry aria-expanded.
    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByRole("menuitem", { name: "English" }).click();

    await page.waitForURL(/\/en\/apartments/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // i18n/locale-cookie.ts persists the choice so the proxy honours it on a
    // later unprefixed visit.
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("en");
  });

  test("keeps the locale when the proxy redirects a guarded route", async ({
    page,
  }) => {
    await page.goto(localePath("en", "/tour"));

    await expect(page).toHaveURL(/\/en\/signin\?next=%2Ftour/);
  });
});
