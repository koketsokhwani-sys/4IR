import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:55431/__fixture", {
    data: { action: "reset" },
  });
});
async function signin(
  page: import("@playwright/test").Page,
  email = "one@example.test",
) {
  await page.goto("/account?mode=signin");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByLabel("Your package")).toBeVisible();
}
for (const port of [3101, 3103])
test(`closed or unsupported mode on ${port} denies access without provider requests`, async ({
  request,
}) => {
  const closedOrigin = `http://127.0.0.1:${port}`;
  for (const path of ["/account", "/onboarding"]) {
    const r = await request.get(closedOrigin + path);
    expect(await r.text()).toContain("Registration isn’t open just yet.");
  }
  for (const path of ["/api/draft", "/auth/callback?code=fake-code"]) {
    const r = await request.get(closedOrigin + path);
    expect(r.status()).toBe(403);
    expect(r.headers()["set-cookie"]).toBeUndefined();
  }
  for (const action of [
    "register",
    "signin",
    "recover",
    "password",
    "draft",
    "signout",
  ])
    expect(
      (
        await request.post(closedOrigin + "/api/" + action, {
          data: { email: "one@example.test", password: "long-test-password" },
          headers: { Origin: closedOrigin },
        })
      ).status(),
    ).toBe(403);
  const stats = await request.post("http://127.0.0.1:55431/__fixture", {
    data: { action: "stats" },
  });
  expect(await stats.json()).toEqual({ providerRequests: 0 });
});
test("CSRF, unauthenticated access, oversized and malformed requests fail closed", async ({
  request,
}) => {
  expect((await request.get("/api/draft")).status()).toBe(401);
  expect((await request.post("/api/register", { data: {} })).status()).toBe(
    403,
  );
  expect(
    (
      await request.post("/api/register", {
        headers: { Origin: "https://evil.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/register", {
        headers: { Origin: origin, "Content-Type": "application/json" },
        data: "x".repeat(32769),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.post("/api/register", {
        headers: { Origin: origin, "Content-Type": "application/json" },
        data: "{",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get("/api/draft", { headers: { Host: "evil.test" } })
    ).status(),
  ).toBe(403);
});
test("registration, generic recovery, rejected login, unverified login and expired callback", async ({
  page,
}) => {
  await page.goto("/account");
  await page.getByLabel("Email address").fill("one@example.test");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("status")).toContainText("check your email");
  await page.goto("/account?mode=recover");
  await page.getByLabel("Email address").fill("nobody@example.test");
  await page.getByRole("button", { name: "Send recovery email" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  await page.goto("/account?mode=signin");
  await page.getByLabel("Email address").fill("one@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("wrong-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Unable to sign in");
  await page.getByLabel("Email address").fill("unverified@example.test");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Unable to sign in");
  await page.goto("/auth/callback?code=expired&next=https://evil.test");
  await expect(page).toHaveURL(/\/account\?mode=signin&notice=expired/);
  await expect(page.getByRole("status")).toContainText("expired");
});
test("verified session, package drafts, persistence, isolation, escaping, mobile layout and signout", async ({
  page,
  browser,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signin(page);
  const stats = await request.post("http://127.0.0.1:55431/__fixture", {
    data: { action: "stats" },
  });
  expect((await stats.json()).providerRequests).toBeGreaterThan(0);
  const cookies = await page.context().cookies();
  expect(
    cookies.some(
      (c) =>
        c.name.startsWith("4ir-auth") && c.httpOnly && c.sameSite === "Lax",
    ),
  ).toBeTruthy();
  expect(await page.evaluate(() => document.cookie)).not.toContain("4ir-auth");
  await page.getByLabel("Your name (required)").fill("Test Customer");
  await page
    .getByLabel("Business name (required)")
    .fill("<script>alert(1)</script>");
  for (const plan of ["starter", "business", "booking", "store"]) {
    await page.getByLabel("Your package").selectOption(plan);
    if (plan === "booking")
      await page
        .getByLabel("Appointment durations, prices and availability (optional)")
        .fill("Mon 09:00; 30 minutes; R100");
    if (plan === "store") {
      await page
        .getByLabel("Product names, descriptions and prices (optional)")
        .fill("Test product R50");
      await page
        .getByLabel("Delivery and collection information (optional)")
        .fill("Collection only");
    }
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    await page.reload();
    await expect(page.getByLabel("Your package")).toHaveValue(plan);
  }
  await expect(page.getByLabel("Business name (required)")).toHaveValue(
    "<script>alert(1)</script>",
  );
  await expect(
    page.getByLabel("Product names, descriptions and prices (optional)"),
  ).toHaveValue("Test product R50");
  const denied = await page.request.post("/api/draft", {
    headers: { Origin: origin },
    data: {
      owner_id: "other",
      plan: "starter",
      contact_name: "Test",
      business_name: "Test",
    },
  });
  expect(denied.status()).toBe(400);
  const privateResponse = await page.request.get("/api/draft");
  expect(privateResponse.headers()["cache-control"]).toContain("no-store");
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signin(otherPage, "two@example.test");
  await expect(otherPage.getByLabel("Business name (required)")).toHaveValue(
    "",
  );
  await other.close();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`onboarding-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/mode=signin/);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
  expect(errors).toEqual([]);
});
test("save failure retains entries, package changes clear stale content, keyboard access, password change signs out", async ({
  page,
}) => {
  await signin(page);
  await page.getByLabel("Your name (required)").fill("Test Customer");
  await page
    .getByLabel("Business name (required)")
    .fill("Retain this unsaved draft");
  await page.route("**/api/draft", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Draft not saved. Please retry." }),
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("not saved");
  await expect(page.getByLabel("Business name (required)")).toHaveValue(
    "Retain this unsaved draft",
  );
  await page.unroute("**/api/draft");
  await page.getByLabel("Your package").selectOption("starter");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByLabel("Your package").selectOption("store");
  await expect(
    page.getByLabel("Product names, descriptions and prices (optional)"),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goto("/account?mode=password");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page
    .getByLabel("Password", { exact: true })
    .fill("another-long-test-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/mode=signin/);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
});
