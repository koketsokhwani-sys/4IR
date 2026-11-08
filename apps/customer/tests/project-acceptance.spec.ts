import { test, expect, type Page } from "@playwright/test";
const headers = { Origin: "http://127.0.0.1:3100" }, fixture = "http://127.0.0.1:55431/__fixture";
const email = "one@example.test", password = "long-test-password";
const complete = { contact_name:"Synthetic customer", business_name:"Synthetic business", phone:"123", description:"About", website_content:"Homepage", services:"Advice", availability:"Monday", products:"Tea", delivery:"Collect" };
async function signIn(page: Page, address=email) { expect((await page.request.post("/api/signin",{headers,data:{email:address,password}})).status()).toBe(200); }
async function seed(page: Page) {
  await signIn(page); const initial=await (await page.request.get("/api/draft")).json();
  expect((await page.request.post("/api/draft",{headers,data:{...complete,plan:"starter",expected_revision:initial.revision,expected_account_id:initial.account_id}})).status()).toBe(200);
  return initial.account_id as string;
}
test.beforeEach(async ({request}) => { await request.post(fixture,{data:{action:"reset"}}); });
for (const plan of ["starter","business","booking","store"]) test(`${plan}: checklist, UI save/reload/relogin and submission`,async ({page}) => {
  await signIn(page); await page.goto("/onboarding");
  await page.getByLabel("Your package").selectOption(plan);
  for (const key of ["contact_name","business_name"] as const) await page.locator(`[name="${key}"]`).fill(complete[key]);
  await page.getByRole("button",{name:"Save draft",exact:true}).click(); await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("link",{name:"Project dashboard and submission"}).click();
  const missing=["About your business","Website text and contact links"];
  if (["business","booking"].includes(plan)) missing.push("Services and page content");
  if (plan==="booking") missing.push("Appointment durations, prices and availability");
  if (plan==="store") missing.push("Product names, descriptions and prices","Delivery and collection information");
  missing.push("A contact number or public business email");
  await expect(page.locator("ul li")).toHaveText(missing);
  await page.getByRole("link",{name:"Edit onboarding draft"}).click();
  await expect(page.locator('[name="business_name"]')).toHaveValue(complete.business_name);
  for (const [key,value] of Object.entries(complete)) { const input=page.locator(`[name="${key}"]`); if(await input.count()) await input.fill(value); }
  await page.getByRole("button",{name:"Save draft",exact:true}).click(); await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload(); await expect(page.locator('[name="business_name"]')).toHaveValue(complete.business_name);
  await page.getByRole("button",{name:"Sign out",exact:true}).click(); await expect(page).toHaveURL(/account/);
  await signIn(page); await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:"Saved draft · revision 2"})).toBeVisible();
  const saved=await (await page.request.get("/api/project")).json(); expect(saved.draft.plan).toBe(plan); expect(saved.missing).toEqual([]);
  await page.getByLabel("I have reviewed").check(); await page.getByRole("button",{name:"Submit saved draft for review"}).click();
  await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
});
test("stale dashboard and account switch cannot submit another revision or identity",async ({page}) => {
  const account=await seed(page); await page.goto("/dashboard"); await page.getByLabel("I have reviewed").check();
  await page.request.post("/api/draft",{headers,data:{...complete,plan:"starter",expected_revision:1,expected_account_id:account}});
  await page.getByRole("button",{name:"Submit saved draft for review"}).click(); await expect(page.locator("main").getByRole("alert")).toContainText("Reload the dashboard");
  expect((await (await page.request.get("/api/project")).json()).submissions).toEqual([]);
  await page.getByRole("button",{name:"Refresh project"}).click(); await page.getByLabel("I have reviewed").check();
  await signIn(page,"two@example.test"); await page.getByRole("button",{name:"Submit saved draft for review"}).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("account changed");
  expect((await (await page.request.get("/api/project")).json()).submissions).toEqual([]);
});
test("repeated keyboard submission and concurrent retries create one snapshot",async ({page}) => {
  const account=await seed(page); await page.goto("/dashboard"); await page.getByLabel("I have reviewed").check();
  let calls=0; let release!:()=>void; const held=new Promise<void>(r=>{release=r;});
  await page.route("**/api/project",async route=>{if(route.request().method()==="POST"){calls++;await held;} await route.continue();});
  const submit=page.getByRole("button",{name:"Submit saved draft for review"}); await submit.focus(); await page.keyboard.press("Enter");
  await expect(submit).toBeDisabled(); await page.keyboard.press("Enter"); release();
  await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible(); expect(calls).toBe(1);
  const results=await Promise.all([1,2].map(()=>page.request.post("/api/project",{headers,data:{expected_revision:1,expected_account_id:account}})));
  expect(results.map(r=>r.status())).toEqual([409,409]); expect((await (await page.request.get("/api/project")).json()).events).toHaveLength(1);
});
test("failed submission recovers; ready-for-planning denies further submission",async ({page}) => {
  const account=await seed(page); await page.goto("/dashboard"); await page.getByLabel("I have reviewed").check();
  await page.request.post(fixture,{data:{action:"fault",target:"database"}});
  await page.getByRole("button",{name:"Submit saved draft for review"}).click(); await expect(page.locator("main").getByRole("alert")).toContainText("could not be confirmed");
  await page.request.post(fixture,{data:{action:"fault",target:""}}); await page.getByRole("button",{name:"Refresh project"}).click();
  await expect(page.getByLabel("I have reviewed")).not.toBeChecked(); await page.getByLabel("I have reviewed").check();
  await page.getByRole("button",{name:"Submit saved draft for review"}).click(); await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
  await page.request.post(fixture,{data:{action:"review-project",email,outcome:"ready_for_planning",note:"Discuss next steps"}});
  await page.request.post("/api/draft",{headers,data:{...complete,plan:"starter",expected_revision:1,expected_account_id:account}});
  await page.getByRole("button",{name:"Refresh project"}).click(); await expect(page.getByRole("heading",{name:"Ready for planning",exact:true})).toBeVisible();
  await expect(page.getByText("This is not payment, development or launch approval.",{exact:false})).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit saved draft for review"})).toHaveCount(0);
  expect((await page.request.post("/api/project",{headers,data:{expected_revision:2,expected_account_id:account}})).status()).toBe(409);
});
test("mobile keyboard navigation, Back/Forward and interrupted edits preserve saved content",async ({page}) => {
  const account=await seed(page), text='<img src=x onerror="window.pwned=1">';
  await page.request.post("/api/draft",{headers,data:{...complete,business_name:text,plan:"starter",expected_revision:1,expected_account_id:account}});
  await page.setViewportSize({width:375,height:812}); await page.goto("/dashboard");
  await page.getByText("Review saved information",{exact:true}).focus(); await page.keyboard.press("Enter");
  await expect(page.getByText(text,{exact:true})).toBeVisible(); expect(await page.evaluate(()=>(window as unknown as {pwned?:number}).pwned)).toBeUndefined();
  await page.getByRole("link",{name:"Edit onboarding draft"}).focus(); await page.keyboard.press("Enter");
  await expect(page.locator('[name="business_name"]')).toHaveValue(text); await page.locator('[name="business_name"]').fill("Unsaved change");
  page.once("dialog",d=>d.dismiss()); await page.getByRole("link",{name:"Project dashboard and submission"}).click();
  await expect(page).toHaveURL(/onboarding/); await expect(page.locator('[name="business_name"]')).toHaveValue("Unsaved change");
  page.once("dialog",d=>d.accept()); await page.getByRole("link",{name:"Project dashboard and submission"}).click();
  await expect(page.getByRole("heading",{name:"Saved draft · revision 2"})).toBeVisible();
  await page.goBack(); await expect(page.locator('[name="business_name"]')).toHaveValue(text);
  await page.goForward(); await expect(page.getByRole("heading",{name:"Saved draft · revision 2"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("persisted browser cache restore refreshes review state and clears consent",async ({page}) => {
  const account=await seed(page); await page.goto("/dashboard"); await page.getByLabel("I have reviewed").check();
  await page.request.post("/api/project",{headers,data:{expected_revision:1,expected_account_id:account}});
  // Native BFCache can be disabled by browser automation; explicitly cover its lifecycle event.
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
  await expect(page.getByLabel("I have reviewed")).toHaveCount(0);
});
for (const [index,flag] of ["absent","false","invalid"].entries()) test(`workflow flag ${flag}: valid authenticated portal still denies dashboard and project API without provider access`,async ({browser,request})=>{
  const origin=`http://127.0.0.1:${3105+index}`;
  const context=await browser.newContext({baseURL:origin});
  try {
    expect((await context.request.post("/api/signin",{headers:{Origin:origin},data:{email,password}})).status()).toBe(200);
    expect((await context.request.get("/api/draft")).status()).toBe(200);
    const stats=async()=> (await (await request.post(fixture,{data:{action:"stats"}})).json()).providerRequests;
    const before=await stats();
    const page=await context.newPage(); await page.goto("/dashboard");
    await expect(page.getByRole("heading",{name:"Project submissions are closed."})).toBeVisible();
    expect((await context.request.get("/api/project")).status()).toBe(403);
    expect((await context.request.post("/api/project",{headers:{Origin:origin},data:{}})).status()).toBe(403);
    expect(await stats()).toBe(before);
  } finally {await context.close();}
});
test("successful submission survives reload and dashboard return without resubmitting",async ({page})=>{
  await seed(page); await page.goto("/dashboard");
  let submissions=0;
  page.on("request",request=>{if(new URL(request.url()).pathname==="/api/project" && request.method()==="POST")submissions++;});
  await page.getByLabel("I have reviewed").check();
  await page.getByRole("button",{name:"Submit saved draft for review"}).click();
  await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
  const before=await (await page.request.get("/api/project")).json();
  expect(before.submissions).toHaveLength(1); expect(before.events).toHaveLength(1);
  for(const returnToDashboard of [false,true]){
    if(returnToDashboard){await page.goto("/onboarding");await expect(page.locator('[name="business_name"]')).toHaveValue(complete.business_name);await page.getByRole("link",{name:"Project dashboard and submission"}).click();}
    else await page.reload();
    await expect(page.getByRole("heading",{name:"Submitted for review",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Submit saved draft for review"})).toHaveCount(0);
    await expect(page.getByLabel("I have reviewed")).toHaveCount(0);
    expect(await (await page.request.get("/api/project")).json()).toEqual(before);
    expect(submissions).toBe(1);
  }
});
test("closing workflow access preserves an existing draft, snapshot and history",async ({page})=>{
  const account=await seed(page);
  expect((await page.request.post("/api/project",{headers,data:{expected_revision:1,expected_account_id:account}})).status()).toBe(200);
  const before=await (await page.request.get("/api/project")).json();
  expect(before.submissions).toHaveLength(1); expect(before.events).toHaveLength(1);
  for(const port of [3105,3106,3107]){
    const origin=`http://127.0.0.1:${port}`;
    // The same valid cookie and provider state reach each feature-off process.
    const draft=await page.request.get(origin+"/api/draft");
    expect(draft.status()).toBe(200);
    expect(await draft.json()).toMatchObject({account_id:account,revision:1,draft:before.draft});
    const stats=async()=> (await (await page.request.post(fixture,{data:{action:"stats"}})).json()).providerRequests;
    const calls=await stats();
    for(const method of ["GET","POST"]){
      const response=await page.request.fetch(origin+"/api/project",{method,maxRedirects:0,headers:{Origin:origin},
        ...(method==="POST"?{data:{expected_revision:1,expected_account_id:account}}:{})});
      expect(response.status()).toBe(403);
      expect(response.headers()["cache-control"]).toContain("private");
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["set-cookie"]).toBeUndefined();
      expect(response.headers().location).toBeUndefined();
    }
    expect(await stats()).toBe(calls);
    // Re-entering the enabled process exposes exactly the original stored state;
    // closing access must not delete data or replay the submission.
    expect(await (await page.request.get("/api/project")).json()).toEqual(before);
  }
});
test("Back after sign-out and account switch rechecks identity without exposing the previous draft",async ({page})=>{
  await seed(page); await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:"Saved draft · revision 1"})).toBeVisible();
  await page.getByRole("link",{name:"Account",exact:true}).click();
  await page.request.post("/api/signout",{headers,data:{}}); await page.goBack();
  await expect(page).toHaveURL(/account/);
  await signIn(page); await page.goto("/dashboard");
  await page.getByRole("link",{name:"Account",exact:true}).click(); await signIn(page,"two@example.test");
  await page.goBack(); await expect(page.getByText("Save your onboarding draft first",{exact:true})).toBeVisible();
  await expect(page.getByText(complete.business_name,{exact:true})).toHaveCount(0);
  // Also cover a persisted editor document across an account switch.
  await signIn(page); await page.goto("/onboarding"); await expect(page.locator('[name="business_name"]')).toHaveValue(complete.business_name);
  await page.locator('[name="business_name"]').fill("Unsaved prior-account text");
  await signIn(page,"two@example.test");
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect(page.locator('[name="business_name"]')).toHaveValue("");
});
test("protected submission fields and malformed revisions cannot create history",async ({page})=>{
  const account=await seed(page);
  const body={expected_revision:1,expected_account_id:account};
  for (const [key,value] of Object.entries({owner_id:account,content:{},plan:"store",status:"ready_for_planning",submitted_at:"2026-01-01",draft_revision:1,role:"admin",paid:true})) {
    expect((await page.request.post("/api/project",{headers,data:{...body,[key]:value}})).status()).toBe(400);
  }
  for (const revision of [0,-1,1.5,"1",2147483647,null]) {
    expect((await page.request.post("/api/project",{headers,data:{...body,expected_revision:revision}})).status()).toBe(400);
  }
  const state=await (await page.request.get("/api/project")).json(); expect(state.submissions).toEqual([]); expect(state.events).toEqual([]);
});
test("dismissing a restoration reload warning keeps prior-account content concealed until explicit reload",async ({page})=>{
  await seed(page); await page.goto("/onboarding");
  await page.locator('[name="business_name"]').fill("Private unsaved prior-account text");
  await signIn(page,"two@example.test");
  // Force a second unload guard even if the application's own dirty guard is
  // deliberately bypassed. Observe and dismiss a real browser dialog.
  await page.evaluate(()=>{
    const guard=(event:BeforeUnloadEvent)=>{
      (window as unknown as {acceptancePrivateInputAtUnload:boolean}).acceptancePrivateInputAtUnload=!!document.querySelector('[name="business_name"]');
      event.preventDefault();event.returnValue="";
    };
    (window as unknown as {acceptanceGuard:typeof guard}).acceptanceGuard=guard;
    window.addEventListener("beforeunload",guard);
  });
  let dialogs=0;
  const dismiss=async (dialog: import("@playwright/test").Dialog)=>{expect(dialog.type()).toBe("beforeunload");dialogs++;await dialog.dismiss();};
  page.on("dialog",dismiss);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect.poll(()=>dialogs).toBe(1);
  expect(await page.evaluate(()=>(window as unknown as {acceptancePrivateInputAtUnload:boolean}).acceptancePrivateInputAtUnload)).toBe(false);
  await expect(page.locator('[name="business_name"]')).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Save draft",exact:true})).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Private unsaved prior-account text");
  await expect(page.getByRole("button",{name:"Reload private page"})).toBeVisible();
  expect((await (await page.request.get("/api/draft")).json()).draft).toBeNull();
  await page.evaluate(()=>window.removeEventListener("beforeunload",(window as unknown as {acceptanceGuard:(event:BeforeUnloadEvent)=>void}).acceptanceGuard));
  page.off("dialog",dismiss);
  await page.getByRole("button",{name:"Reload private page"}).click();
  await expect(page.locator('[name="business_name"]')).toHaveValue("");
});
test("persisted restoration deliberately bypasses the stale dirty-form warning",async ({page})=>{
  await seed(page); await page.goto("/onboarding");
  await page.locator('[name="business_name"]').fill("Private unsaved text");
  await signIn(page,"two@example.test");
  let dialogs=0;
  page.on("dialog",async dialog=>{dialogs++;await dialog.dismiss();});
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect(page.locator('[name="business_name"]')).toHaveValue("");
  expect(dialogs).toBe(0);
});
test("cancelled dashboard restoration stays locked when an earlier read completes",async ({page})=>{
  await seed(page); await page.goto("/dashboard");
  await page.getByLabel("I have reviewed").check();
  let finish!:()=>void, reading=false;
  const held=new Promise<void>(resolve=>{finish=resolve;});
  await page.route("**/api/project",async route=>{
    const response=await route.fetch(); reading=true; await held; await route.fulfill({response});
  });
  await page.getByRole("button",{name:"Refresh project"}).click(); await expect.poll(()=>reading).toBe(true);
  await page.evaluate(()=>{
    const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    (window as unknown as {acceptanceGuard:typeof guard}).acceptanceGuard=guard;
    window.addEventListener("beforeunload",guard);
  });
  let dialogs=0;
  page.on("dialog",async dialog=>{expect(dialog.type()).toBe("beforeunload");dialogs++;await dialog.dismiss();});
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect.poll(()=>dialogs).toBe(1);
  await expect(page.getByRole("button",{name:"Reload private page"})).toBeVisible();
  const completed=page.waitForResponse(response=>response.url().endsWith("/api/project")); finish(); await (await completed).finished();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
  await expect(page.getByRole("button",{name:"Submit saved draft for review"})).toHaveCount(0);
  await expect(page.getByLabel("I have reviewed")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Saved draft · revision 1"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Reload private page"})).toBeVisible();
  await page.evaluate(()=>window.removeEventListener("beforeunload",(window as unknown as {acceptanceGuard:(event:BeforeUnloadEvent)=>void}).acceptanceGuard));
});
