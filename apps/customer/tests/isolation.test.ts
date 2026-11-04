import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateDraft } from "../lib/draft.ts";
test("actual PostgreSQL RLS: own read/write only; anonymous, unverified, forged ownership, reassignment and privileged fields denied", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
  insert into auth.users values ('00000000-0000-0000-0000-000000000001',now(),false),('00000000-0000-0000-0000-000000000002',now(),false),('00000000-0000-0000-0000-000000000003',null,false),('00000000-0000-0000-0000-000000000004',now(),true);`);
    await db.exec(
      await readFile(
        new URL("../database/foundation.sql", import.meta.url),
        "utf8",
      ),
    );
    const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
    const as = async (n: number, role = "authenticated") => {
      await db.exec("reset role");
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
        uid(n),
      ]);
      await db.exec("set role " + role);
    };
    const { plan, ...content } = validateDraft({
      plan: "starter",
      contact_name: "Test",
      business_name: "Business",
    });
    const insert = (owner: number, p = "starter", data: unknown = content) =>
      db.query(
        "insert into public.onboarding_drafts(owner_id,plan,content) values ($1,$2,$3)",
        [uid(owner), p, JSON.stringify(data)],
      );
    await as(1);
    await insert(1);
    assert.equal(
      (await db.query("select * from public.onboarding_drafts")).rows.length,
      1,
    );
    await assert.rejects(insert(2));
    await as(2);
    assert.equal(
      (await db.query("select * from public.onboarding_drafts")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.onboarding_drafts set plan='business' where owner_id=$1 returning *",
          [uid(1)],
        )
      ).rows.length,
      0,
    );
    await insert(2);
    await as(1);
    await assert.rejects(
      db.query(
        "update public.onboarding_drafts set owner_id=$1 where owner_id=$2",
        [uid(3), uid(1)],
      ),
    );
    await assert.rejects(
      db.query("update public.onboarding_drafts set content=$1", [
        JSON.stringify({ ...content, role: "admin" }),
      ]),
    );
    await assert.rejects(
      db.query("update public.onboarding_drafts set plan='free'"),
    );
    await assert.rejects(
      db.query("update public.onboarding_drafts set content=$1", [
        JSON.stringify({ ...content, products: "Not allowed on starter" }),
      ]),
    );
    await assert.rejects(
      db.query("update public.onboarding_drafts set content=$1", [
        JSON.stringify({ ...content, description: "x".repeat(2001) }),
      ]),
    );
    await assert.rejects(db.query("delete from public.onboarding_drafts"));
    await db.query(
      "update public.onboarding_drafts set plan='business' where owner_id=$1",
      [uid(1)],
    );
    for (const n of [3, 4]) {
      await as(n);
      assert.equal(
        (await db.query("select * from public.onboarding_drafts")).rows.length,
        0,
      );
      await assert.rejects(insert(n));
    }
    await as(1, "anon");
    await assert.rejects(db.query("select * from public.onboarding_drafts"));
    await assert.rejects(insert(3));
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [uid(1)]);
    assert.equal(
      (
        await db.query(
          "select * from public.onboarding_drafts where owner_id=$1",
          [uid(1)],
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
