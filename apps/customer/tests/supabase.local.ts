import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const origin = "http://127.0.0.1:3102";
const headers = { Origin: origin };
const password = "Local-only-test-password-42!";
const api = "http://127.0.0.1:56321";
const usedMessages = new Set<string>();
async function mailLink(page: Page, email: string) {
  let id: string | undefined;
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:56324/api/v1/messages");
    const inbox = await response.json();
    id = inbox.messages.find((m: { ID: string; To: { Address: string }[] }) => !usedMessages.has(m.ID) && m.To.some(t => t.Address === email))?.ID;
    return !!id;
  }, { timeout: 15000 }).toBe(true);
  usedMessages.add(id!);
  const message = await (await page.request.get(`http://127.0.0.1:56324/api/v1/message/${id}`)).json();
  const link = (message.HTML as string).match(/href="([^"]*\/auth\/v1\/verify[^\"]*)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(link).toBeTruthy();
  expect(new URL(link!).origin).toBe(api);
  return link!;
}
test("real local confirmation, refresh, package drafts, RLS, recovery and logout", async ({ page, browser }) => {
  const email = `customer-${Date.now()}@example.test`;
  expect((await page.request.post("/api/register", { headers, data: { email, password } })).status()).toBe(200);
  expect((await page.request.post("/api/signin", { headers, data: { email, password } })).status()).toBe(401);
  await page.goto(await mailLink(page, email));
  await expect(page).toHaveURL(`${origin}/onboarding`);
  await expect(page.getByLabel("Your package")).toBeVisible();
  const initial = await (await page.request.get("/api/draft")).json();
  let revision = 0;
  for (const plan of ["starter", "business", "booking", "store"]) {
    const data = { plan, contact_name: "Local customer", business_name: `Local ${plan}`, services: "Consulting", availability: "Monday", products: "Tea", delivery: "Collection", expected_revision: revision, expected_account_id: initial.account_id };
    const save = await page.request.post("/api/draft", { headers, data });
    expect(save.status()).toBe(200);
    revision = (await save.json()).revision;
    expect((await page.request.post("/api/draft", { headers, data })).status()).toBe(409);
    const stored = await (await page.request.get("/api/draft")).json();
    expect(stored.draft.plan).toBe(plan);
    expect(stored.revision).toBe(revision);
  }
  // Complete the saved store draft, then race explicit submissions against real PostgREST.
  const completed = { ...(await (await page.request.get("/api/draft")).json()).draft, phone: "123", description: "Synthetic shop", website_content: "Homepage", expected_revision: revision, expected_account_id: initial.account_id };
  const completedSave = await page.request.post("/api/draft", { headers, data: completed });
  expect(completedSave.status()).toBe(200);
  revision = (await completedSave.json()).revision;
  const submissionBody = { expected_revision: revision, expected_account_id: initial.account_id };
  const attempts = await Promise.all([page.request.post("/api/project", { headers, data: submissionBody }), page.request.post("/api/project", { headers, data: submissionBody })]);
  expect(attempts.map(r => r.status()).sort()).toEqual([200,409]);
  const project = await (await page.request.get("/api/project")).json();
  expect(project.submissions).toHaveLength(1); expect(project.events).toHaveLength(1);
  expect(project.submissions[0].status).toBe("submitted");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Submitted for review", exact: true })).toBeVisible();
  const storedDraft = (await (await page.request.get("/api/draft")).json()).draft;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const anon = createClient(api, key, { auth: { persistSession: false } });
  expect((await anon.from("onboarding_drafts").select()).error?.code).toBe("42501");
  expect((await anon.from("project_submissions").select()).error?.code).toBe("42501");
  expect((await anon.from("project_events").select("note")).error?.code).toBe("42501");
  const other = await browser.newContext({ baseURL: origin });
  const otherPage = await other.newPage();
  const otherEmail = `other-${Date.now()}@example.test`;
  expect((await otherPage.request.post("/api/register", { headers, data: { email: otherEmail, password } })).status()).toBe(200);
  await otherPage.goto(await mailLink(otherPage, otherEmail));
  const customer = createClient(api, key, { auth: { persistSession: false } });
  expect((await customer.auth.signInWithPassword({ email: otherEmail, password })).error).toBeNull();
  expect((await customer.from("onboarding_drafts").select()).data).toEqual([]);
  expect((await customer.from("onboarding_drafts").update({ plan: "starter" }).eq("owner_id", initial.account_id).select()).data).toEqual([]);
  expect((await customer.from("onboarding_drafts").insert({ owner_id: initial.account_id, plan: "starter", content: (() => { const { plan, ...content } = storedDraft; return content; })() })).error?.code).toBe("42501");
  expect((await customer.from("onboarding_drafts").update({ revision: 99 }).eq("owner_id", (await customer.auth.getUser()).data.user!.id)).error?.code).toBe("42501");
  const otherId = (await customer.auth.getUser()).data.user!.id;
  for (const change of [{ owner_id: initial.account_id }, { updated_at: new Date().toISOString() }]) {
    expect((await customer.from("onboarding_drafts").update(change).eq("owner_id", otherId)).error?.code).toBe("42501");
  }
  expect((await customer.from("onboarding_drafts").delete().eq("owner_id", otherId)).error?.code).toBe("42501");
  expect((await customer.schema("private").rpc("is_verified_customer")).error?.code).toBe("PGRST106");
  expect((await customer.from("project_submissions").select()).data).toEqual([]);
  expect((await customer.from("project_events").select("note")).data).toEqual([]);
  expect((await customer.from("project_submissions").insert({owner_id:initial.account_id,draft_revision:revision})).error?.code).toBe("42501");
  expect((await customer.from("project_submissions").update({status:"ready_for_planning"}).eq("owner_id",initial.account_id)).error?.code).toBe("42501");
  expect((await customer.from("project_events").insert({submission_id:project.submissions[0].id,owner_id:otherId,event_number:2,status:"ready_for_planning",note:"Forged"})).error?.code).toBe("42501");
  expect((await customer.schema("private").rpc("review_submission",{target:project.submissions[0].id,outcome:"ready_for_planning",customer_note:"Forged"})).error?.code).toBe("PGRST106");
  await customer.auth.signOut();
  await other.close();
  // Force the real SSR SDK to refresh the session; no provider token is forged.
  const cookie = (await page.context().cookies()).find(c => c.name === "4ir-auth")!;
  const session = JSON.parse(Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString());
  const previousRefresh = session.refresh_token;
  session.expires_at = 1;
  await page.context().addCookies([{ ...cookie, value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url") }]);
  expect((await page.request.get("/api/draft")).status()).toBe(200);
  const refreshed = (await page.context().cookies()).find(c => c.name === "4ir-auth")!;
  expect(JSON.parse(Buffer.from(refreshed.value.replace(/^base64-/, ""), "base64url").toString()).refresh_token).not.toBe(previousRefresh);
  expect((await page.request.post("/api/signout", { headers, data: {} })).status()).toBe(200);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
  expect((await page.request.post("/api/recover", { headers, data: { email } })).status()).toBe(200);
  await page.goto(await mailLink(page, email));
  await expect(page).toHaveURL(`${origin}/account?mode=password`);
  const newPassword = password + "changed";
  expect((await page.request.post("/api/password", { headers, data: { password: newPassword } })).status()).toBe(200);
  expect((await page.request.get("/api/draft")).status()).toBe(401);
  expect((await page.request.post("/api/signin", { headers, data: { email, password } })).status()).toBe(401);
  expect((await page.request.post("/api/signin", { headers, data: { email, password: newPassword } })).status()).toBe(200);
  expect((await (await page.request.get("/api/draft")).json()).revision).toBe(revision);
  await page.request.post("/api/signout", { headers, data: {} });
});
