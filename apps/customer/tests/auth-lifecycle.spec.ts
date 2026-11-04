import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
const origin = "http://127.0.0.1:3100";
const fixture = "http://127.0.0.1:55431/__fixture";
const headers = { Origin: origin };
async function signIn(request: APIRequestContext, email = "one@example.test") {
  const r = await request.post("/api/signin", {
    headers,
    data: { email, password: "long-test-password" },
  });
  expect(r.status()).toBe(200);
}
async function sessionCookie(context: BrowserContext) {
  const cookie = (await context.cookies()).find((c) => c.name === "4ir-auth");
  expect(cookie).toBeDefined();
  const value = JSON.parse(
    Buffer.from(cookie!.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  return { cookie: cookie!, value };
}
async function expire(context: BrowserContext) {
  const { cookie, value } = await sessionCookie(context);
  value.expires_at = 1;
  await context.addCookies([
    {
      ...cookie,
      value:
        "base64-" + Buffer.from(JSON.stringify(value)).toString("base64url"),
    },
  ]);
  return value;
}
async function emailLink(
  request: APIRequestContext,
  email = "one@example.test",
) {
  const r = await request.post(fixture, { data: { action: "mail", email } });
  const { url } = await r.json();
  expect(url).toContain("/auth/callback");
  return url as string;
}
test.beforeEach(async ({ request }) => {
  await request.post(fixture, { data: { action: "reset" } });
});

test("verification code is single-use and bound to the initiating browser PKCE verifier", async ({
  page,
  browser,
}) => {
  expect(
    (
      await page.request.post("/api/register", {
        headers,
        data: { email: "one@example.test", password: "long-test-password" },
      })
    ).status(),
  ).toBe(200);
  const link = await emailLink(page.request);
  const verifier = (await page.context().cookies()).find((c) =>
    c.name.endsWith("code-verifier"),
  );
  expect(verifier?.httpOnly).toBe(true);
  expect((await page.request.post("/api/signin", {
    headers, data: { email: "one@example.test", password: "wrong-long-password" },
  })).status()).toBe(401);
  expect((await page.context().cookies()).some(c => c.name.endsWith("code-verifier"))).toBe(true);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(link);
  await expect(otherPage).toHaveURL(/notice=expired/);
  expect((await otherPage.request.get("/api/draft")).status()).toBe(401);
  await other.close();
  await page.goto(link);
  await expect(page).toHaveURL("/onboarding");
  await expect(page.getByLabel("Your package")).toBeVisible();
  expect((await page.request.get("/api/draft")).status()).toBe(200);
  await page.goto(link);
  await expect(page).toHaveURL(/notice=expired/);
});

test("recovery exchanges PKCE code, updates password and revokes refresh sessions globally", async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage.request);
  expect(
    (
      await page.request.post("/api/recover", {
        headers,
        data: { email: "one@example.test" },
      })
    ).status(),
  ).toBe(200);
  await page.goto(await emailLink(page.request));
  await expect(page).toHaveURL(/mode=password/);
  await page
    .getByLabel("Password", { exact: true })
    .fill("changed-test-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/mode=signin/);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
  // Already-issued access tokens can remain valid: test denial when refresh is required.
  await expire(other);
  expect((await otherPage.request.get("/api/draft")).status()).toBe(401);
  await other.close();
});

test("expired session refresh rotates HttpOnly cookie; revoked refresh fails closed", async ({
  page,
}) => {
  await signIn(page.request);
  const previous = await expire(page.context());
  const refreshed = await page.request.get("/api/draft");
  expect(refreshed.status()).toBe(200);
  expect(refreshed.headers()["cache-control"]).toContain("no-store");
  const next = await sessionCookie(page.context());
  expect(next.value.refresh_token).not.toBe(previous.refresh_token);
  expect(next.cookie.httpOnly).toBe(true);
  expect(next.value.expires_at).toBeGreaterThan(Date.now() / 1000);
  await page.request.post(fixture, {
    data: { action: "revoke", email: "one@example.test" },
  });
  await expire(page.context());
  expect((await page.request.get("/api/draft")).status()).toBe(401);
});

test("tampered cookie identity cannot change the server-verified owner; forged access is denied", async ({
  page,
}) => {
  await signIn(page.request);
  const { cookie, value } = await sessionCookie(page.context());
  value.user.id = "00000000-0000-0000-0000-000000000002";
  await page.context().addCookies([
    {
      ...cookie,
      value:
        "base64-" + Buffer.from(JSON.stringify(value)).toString("base64url"),
    },
  ]);
  const write = await page.request.post("/api/draft", {
    headers,
    data: {
      plan: "starter",
      contact_name: "Test",
      business_name: "My own draft",
      expected_revision: 0,
      expected_account_id: "00000000-0000-0000-0000-000000000001",
    },
  });
  expect(write.status()).toBe(200);
  const own = await page.request.get("/api/draft");
  expect((await own.json()).draft.business_name).toBe("My own draft");
  value.access_token += "forged";
  await page.context().addCookies([
    {
      ...cookie,
      value:
        "base64-" + Buffer.from(JSON.stringify(value)).toString("base64url"),
    },
  ]);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
});

test("provider outage is retryable and preserves the session rather than requesting another login", async ({
  page,
}) => {
  await signIn(page.request);
  const before = await sessionCookie(page.context());
  await page.request.post(fixture, {
    data: { action: "fault", target: "user" },
  });
  expect((await page.request.get("/api/draft")).status()).toBe(503);
  expect((await sessionCookie(page.context())).value.refresh_token).toBe(
    before.value.refresh_token,
  );
  await page.request.post(fixture, { data: { action: "fault", target: "" } });
  expect((await page.request.get("/api/draft")).status()).toBe(200);
});

test("stale writes and simultaneous first saves return conflict without overwriting newer content", async ({
  page,
}) => {
  await signIn(page.request);
  const data = {
    plan: "starter",
    contact_name: "Test",
    business_name: "First draft",
    expected_revision: 0,
    expected_account_id: "00000000-0000-0000-0000-000000000001",
  };
  expect(
    (await page.request.post("/api/draft", { headers, data })).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/draft", {
        headers,
        data: { ...data, business_name: "Stale initial save" },
      })
    ).status(),
  ).toBe(409);
  const first = await (await page.request.get("/api/draft")).json();
  expect(
    (
      await page.request.post("/api/draft", {
        headers,
        data: {
          ...data,
          business_name: "Newer content",
          expected_revision: first.revision,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/draft", {
        headers,
        data: {
          ...data,
          business_name: "Stale edit",
          expected_revision: first.revision,
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (await (await page.request.get("/api/draft")).json()).draft.business_name,
  ).toBe("Newer content");
  expect(
    (
      await page.request.post("/api/draft", {
        headers,
        data: { ...data, expected_revision: -1 },
      })
    ).status(),
  ).toBe(400);
});

test("two tabs show conflict, retain unsaved edits and reload only after confirmation", async ({
  page,
}) => {
  await signIn(page.request);
  await page.request.post("/api/draft", {
    headers,
    data: {
      plan: "starter",
      contact_name: "Test",
      business_name: "Original",
      expected_revision: 0,
      expected_account_id: "00000000-0000-0000-0000-000000000001",
    },
  });
  await page.goto("/onboarding");
  await expect(page.getByLabel("Business name (required)")).toHaveValue(
    "Original",
  );
  const second = await page.context().newPage();
  await second.goto("/onboarding");
  await expect(second.getByLabel("Business name (required)")).toHaveValue(
    "Original",
  );
  await page
    .getByLabel("Business name (required)")
    .fill("Saved from first tab");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await second
    .getByLabel("Business name (required)")
    .fill("Keep my unsaved edit");
  await second.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(second.getByRole("status")).toContainText("newer draft");
  await expect(second.getByLabel("Business name (required)")).toHaveValue(
    "Keep my unsaved edit",
  );
  await expect(
    second.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  second.once("dialog", (dialog) => dialog.accept());
  await second.getByRole("button", { name: "Reload latest draft" }).click();
  await expect(second.getByLabel("Business name (required)")).toHaveValue(
    "Saved from first tab",
  );
  await second.close();
});

test("signup with misconfigured auto-confirmation clears the session even if provider logout fails", async ({
  page,
}) => {
  await page.request.post(fixture, {
    data: { action: "fault", target: "auto-confirm-logout-failure" },
  });
  const response = await page.request.post("/api/register", {
    headers,
    data: { email: "one@example.test", password: "long-test-password" },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain(
    "verification is not configured",
  );
  expect(
    (await page.context().cookies()).filter((c) =>
      c.name.startsWith("4ir-auth"),
    ),
  ).toEqual([]);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
});

test("explicit signout clears browser cookies during a provider outage without claiming revocation", async ({
  page,
}) => {
  await signIn(page.request);
  await page.request.post(fixture, {
    data: { action: "fault", target: "logout" },
  });
  const response = await page.request.post("/api/signout", {
    headers,
    data: {},
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain(
    "revocation could not be confirmed",
  );
  expect(
    (await page.context().cookies()).filter((c) =>
      c.name.startsWith("4ir-auth"),
    ),
  ).toEqual([]);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
});

test("signing into a different account in another tab cannot save the old account draft", async ({
  page,
}) => {
  await signIn(page.request);
  await page.goto("/onboarding");
  await expect(page.getByLabel("Your package")).toBeVisible();
  await page.getByLabel("Your name (required)").fill("First customer");
  await page
    .getByLabel("Business name (required)")
    .fill("First customer private draft");
  await signIn(page.request, "two@example.test");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("account changed");
  await expect(page.getByLabel("Business name (required)")).toHaveValue(
    "First customer private draft",
  );
  expect(
    (await (await page.request.get("/api/draft")).json()).draft,
  ).toBeNull();
});
