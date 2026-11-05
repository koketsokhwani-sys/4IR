import { test, expect } from "@playwright/test";
const headers = { Origin: "http://127.0.0.1:3100" };
const email = "one@example.test";
test("dashboard checklist, explicit submission, immutable history, review/resubmit and isolation", async ({ page, browser }) => {
  await page.request.post("http://127.0.0.1:55431/__fixture",{data:{action:"reset"}});
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/account/);
  await page.request.post("/api/signin",{headers,data:{email,password:"long-test-password"}});
  const initial = await (await page.request.get("/api/project")).json();
  const draft = {plan:"booking", contact_name:"Test", business_name:"Synthetic business", expected_account_id:initial.account_id,expected_revision:0};
  await page.request.post("/api/draft",{headers,data:draft});
  await page.goto("/dashboard");
  await expect(page.getByText("Draft — not submitted")).toBeVisible();
  await expect(page.getByRole("listitem").filter({hasText:"Appointment durations"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit saved draft"})).toHaveCount(0);
  expect((await page.request.post("/api/project",{headers,data:{expected_account_id:initial.account_id,expected_revision:1}})).status()).toBe(400);
  const complete={...draft,expected_revision:1,phone:"123",description:"About",website_content:"Home",services:"Advice",availability:"Monday"};
  await page.request.post("/api/draft",{headers,data:complete});
  await page.getByRole("button",{name:"Refresh project"}).click();
  const submit = page.getByRole("button",{name:"Submit saved draft for review"});
  await expect(submit).toBeDisabled();
  await page.getByLabel("I have reviewed").check(); await submit.click();
  await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
  const body={expected_account_id:initial.account_id,expected_revision:2};
  expect((await page.request.post("/api/project",{headers,data:body})).status()).toBe(409);
  expect((await page.request.post("/api/project",{headers:{Origin:"https://evil.example.test"},data:body})).status()).toBe(403);
  expect((await page.request.post("/api/project",{headers,data:{...body,status:"ready_for_planning"}})).status()).toBe(400);
  await page.request.post("/api/draft",{headers,data:{...complete,expected_revision:2,business_name:"Changed later"}});
  await page.getByRole("button",{name:"Refresh project"}).click();
  await page.getByText("View submitted information",{exact:true}).click();
  await expect(page.getByText("Synthetic business",{exact:true})).toBeVisible();
  await page.request.post("http://127.0.0.1:55431/__fixture",{data:{action:"review-project",email,outcome:"changes_requested",note:"Please clarify <script>window.pwned=1</script>"}});
  await page.getByRole("button",{name:"Refresh project"}).click();
  await expect(page.getByText("Please clarify <script>window.pwned=1</script>",{exact:true})).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {pwned?:number}).pwned)).toBeUndefined();
  await page.getByLabel("I have reviewed").check(); await submit.click();
  await expect(page.getByRole("heading",{name:"Revision 3 · Submitted for review"})).toBeVisible();
  const other=await browser.newContext({baseURL:"http://127.0.0.1:3100"});
  await other.request.post("/api/signin",{headers,data:{email:"two@example.test",password:"long-test-password"}});
  expect((await (await other.request.get("/api/project")).json()).submissions).toEqual([]);
  expect((await other.request.post("/api/project",{headers,data:body})).status()).toBe(409);
  await other.close();
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("closed workflow denies project access before contacting a provider", async ({ request }) => {
  for (const port of [3101,3103]) {
    expect((await request.get(`http://127.0.0.1:${port}/api/project`)).status()).toBe(403);
    expect((await request.post(`http://127.0.0.1:${port}/api/project`,{headers:{Origin:`http://127.0.0.1:${port}`},data:{}})).status()).toBe(403);
  }
});
test("uncertain submission response requires refresh and never replays the action automatically", async ({ page }) => {
  await page.request.post("http://127.0.0.1:55431/__fixture",{data:{action:"reset"}});
  await page.request.post("/api/signin",{headers,data:{email,password:"long-test-password"}});
  const initial = await (await page.request.get("/api/draft")).json();
  await page.request.post("/api/draft",{headers,data:{plan:"starter",contact_name:"Test",business_name:"Business",phone:"123",description:"About",website_content:"Home",expected_revision:0,expected_account_id:initial.account_id}});
  await page.goto("/dashboard");
  await page.getByLabel("I have reviewed").check();
  await page.route("**/api/project",async route => {
    if (route.request().method() === "POST") { await route.fetch(); await route.abort(); }
    else await route.continue();
  });
  await page.getByRole("button",{name:"Submit saved draft for review"}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit saved draft for review"})).toHaveCount(0);
  await page.unroute("**/api/project");
  await page.getByRole("button",{name:"Refresh project"}).click();
  await expect(page.getByRole("heading",{name:"Revision 1 · Submitted for review"})).toBeVisible();
  expect((await (await page.request.get("/api/project")).json()).submissions).toHaveLength(1);
});
