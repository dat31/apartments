import { test, expect, e2eCredentials } from "../fixtures";

/* The owner dashboard renders on the server. Read-only, like saved.spec.ts:
   the suite points at the shared Supabase project, so nothing here pauses,
   publishes or deletes a listing that would outlive the run.

   That rules out driving the write islands, but the reads are what changed —
   and the assertion that actually pins the change is the raw HTML one below.
   `lib/services/**` is excluded from unit coverage by design (AGENTS.md), so
   these specs are the only proof the server path works at all. */
test.describe("owner dashboard", () => {
  test.skip(
    !e2eCredentials(),
    "E2E_EMAIL / E2E_PASSWORD not set in .env.local"
  );

  test("the overview tab shows the owner's listings", async ({ page }) => {
    await page.goto("/owner/dashboard/overview");

    await expect(page).not.toHaveURL(/\/signin/);
    // Either rows or the empty state — a fresh account owns nothing, and both
    // are the tab having rendered rather than having stalled on a gate.
    await expect(
      page
        .getByRole("heading", { name: "Chưa có gì ở đây" })
        .or(page.locator('a[href*="/virtual-tour/edit"]').first())
    ).toBeVisible({ timeout: 30_000 });
  });

  test("the greeting and the tab counts come from the server", async ({
    page,
    context,
  }) => {
    await page.goto("/owner/dashboard/overview");
    await expect(
      page.getByText("Chào mừng trở lại,", { exact: false })
    ).toBeVisible({ timeout: 30_000 });

    /* The regression this spec exists for. Fetched over HTTP with the same
       session cookies and no JavaScript at all: if the dashboard ever goes
       back to fetching itself after hydration, the greeting and the nav
       counts leave the HTML and this fails while the test above still
       passes. */
    const response = await context.request.get("/owner/dashboard/overview");
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain("Chào mừng trở lại,");
    expect(html).toContain("Tổng quan");
  });

  test("every tab is reachable and renders", async ({ page }) => {
    for (const tab of ["overview", "active", "drafts", "tours", "availability"]) {
      await page.goto(`/owner/dashboard/${tab}`);
      await expect(page, `${tab} should not redirect`).not.toHaveURL(/\/signin/);
      await expect(
        page.getByRole("heading", { level: 1 }),
        `${tab} should render the dashboard chrome`
      ).toBeVisible({ timeout: 30_000 });
    }
  });
});
