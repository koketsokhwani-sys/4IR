import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateDraft } from "../lib/draft.ts";
import { missingSubmissionFields } from "../lib/project.ts";
const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
test("submission completion follows the package; saving remains permissive", () => {
  for (const plan of ["starter", "business", "booking", "store"]) {
    const draft = validateDraft({ plan, contact_name: "Test", business_name: "Business" });
    assert.ok(missingSubmissionFields(draft).length);
    assert.equal(missingSubmissionFields({ ...draft, phone: "123", description: "About", website_content: "Home", services: "Consulting", availability: "Monday", products: "Tea", delivery: "Collect" }).length, 0);
  }
});
test("Postgres submissions: immutable snapshot, strict owner grants, completion, stale/duplicate protection and operator-only history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
      insert into auth.users values ('${uid(1)}',now(),false),('${uid(2)}',now(),false),('${uid(3)}',null,false),('${uid(4)}',now(),true);`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(dir)).filter(n => n.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name,dir),"utf8"));
    await db.exec(await readFile(new URL("../database/review-project-access.sql",import.meta.url),"utf8"));
    const as = async (n: number, role = "authenticated") => { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid(n)]); await db.exec("set role " + role); };
    const { plan, ...content } = validateDraft({ plan: "starter", contact_name: "Test", business_name: "Business" });
    const submit = (n: number, revision: number) => db.query<{id:string}>("insert into public.project_submissions(owner_id,draft_revision) values ($1,$2) returning id",[uid(n),revision]);
    for (const chosen of ["starter","business","booking","store"]) {
      const { plan: selected, ...incomplete } = validateDraft({ plan: chosen, contact_name:"Name", business_name:"Business", phone:"123", description:"About", website_content:"Home" });
      const check = async (value: unknown) => (await db.query<{valid:boolean}>("select private.submission_complete($1,$2) as valid",[value,selected])).rows[0].valid;
      assert.equal(await check(incomplete),chosen === "starter");
      const { plan: _, ...complete } = validateDraft({...incomplete,plan:chosen,services:"Advice",availability:"Monday",products:"Tea",delivery:"Collect"});
      assert.equal(await check(complete),true);
    }
    await as(1);
    await db.query("insert into public.onboarding_drafts(owner_id,plan,content) values ($1,$2,$3)",[uid(1),plan,content]);
    await assert.rejects(submit(1,1)); // incomplete
    const complete = { ...content, phone: "123", description: "Description", website_content: "Homepage" };
    await db.query("update public.onboarding_drafts set content=$1",[complete]);
    await assert.rejects(submit(1,1)); // stale
    await assert.rejects(submit(2,2)); // forged owner
    const id = (await submit(1,2)).rows[0].id;
    await assert.rejects(submit(1,2));
    assert.equal((await db.query<{status:string}>("select status from public.project_submissions")).rows[0].status,"submitted");
    for (const change of ["status='ready_for_planning'", "plan='store'", "content='{}'", "owner_id='"+uid(2)+"'", "draft_revision=99"]) await assert.rejects(db.exec("update public.project_submissions set " + change));
    await assert.rejects(db.exec("delete from public.project_submissions"));
    await assert.rejects(db.query("insert into public.project_submissions(owner_id,draft_revision,status) values ($1,99,'ready_for_planning')",[uid(1)]));
    await assert.rejects(db.exec("delete from public.project_events"));
    await assert.rejects(db.query("insert into public.project_events(submission_id,owner_id,event_number,status,note) values($1,$2,2,'ready_for_planning','Forged')",[id,uid(1)]));
    await assert.rejects(db.exec("update public.project_events set note='Forged'"));
    await assert.rejects(db.query("select private.review_submission($1,'ready_for_planning','Forged')",[id]));
    await assert.rejects(db.exec("select recorded_by from public.project_events"));
    await db.query("update public.onboarding_drafts set content=$1",[{...complete, business_name:"Changed later"}]);
    assert.equal((await db.query<{content:typeof complete}>("select content from public.project_submissions")).rows[0].content.business_name,"Business");
    await assert.rejects(submit(1,3)); // pending review blocks new revision
    for (const n of [2,3,4]) {
      await as(n);
      assert.equal((await db.query("select id from public.project_submissions")).rows.length,0);
      assert.equal((await db.query("select note from public.project_events")).rows.length,0);
      await assert.rejects(submit(n,1));
    }
    await as(1,"anon");
    await assert.rejects(db.exec("select id from public.project_submissions"));
    await assert.rejects(db.exec("select note from public.project_events"));
    await assert.rejects(submit(1,3));
    await db.exec("reset role");
    await assert.rejects(db.query("select private.review_submission($1,'paid','No')",[id]));
    await assert.rejects(db.query("select private.review_submission($1,'changes_requested','   ')",[id]));
    await db.query("select private.review_submission($1,'changes_requested','Please clarify your services.')",[id]);
    await assert.rejects(db.query("select private.review_submission($1,'ready_for_planning','Stale operator')",[id]));
    await as(1);
    const history = await db.query<{status:string,note:string}>("select status,note from public.project_events order by event_number");
    assert.equal(history.rows.length,2); assert.equal(history.rows[1].status,"changes_requested");
    const next = (await submit(1,3)).rows[0].id;
    await db.exec("reset role");
    await db.query("select private.review_submission($1,'ready_for_planning','We can discuss the next steps.')",[next]);
    await as(1);
    await db.query("update public.onboarding_drafts set content=$1",[complete]);
    await assert.rejects(submit(1,4));
    assert.equal((await db.query("select note from public.project_events")).rows.length,4);
  } finally { await db.close(); }
});
