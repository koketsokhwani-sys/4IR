import test from "node:test";
import assert from "node:assert/strict";
import { portalConfig } from "../lib/config.ts";
import { validateDraft, credentials, planIds } from "../lib/draft.ts";
const env = {
  PORTAL_MODE: "local",
  PORTAL_ORIGIN: "http://127.0.0.1:3100",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "test-only",
};
test("portal closed by default; remote backend/origin and malformed URL denied", () => {
  assert.equal(portalConfig({}), null);
  assert.ok(portalConfig(env));
  for (const value of [
    "https://munchies.supabase.co",
    "https://4ir.supabase.co",
    "http://localhost.evil.test",
    "http://user@localhost",
    "http://127.0.0.1/path",
    "http://127.0.0.1?x=1",
  ]) {
    assert.equal(portalConfig({ ...env, SUPABASE_URL: value }), null);
    assert.equal(portalConfig({ ...env, PORTAL_ORIGIN: value }), null);
  }
});
test("hosted settings and public launch variables cannot enable this local foundation", () => {
  const remote = {
    PORTAL_ORIGIN: "https://portal.example.test",
    SUPABASE_URL: "https://qcxtcwvibgizqynkjtja.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_not_a_real_key",
    NEXT_PUBLIC_PORTAL_MODE: "local",
    PORTAL_LAUNCH_ENABLED: "true",
  };
  for (const mode of [undefined, "", "closed", "hosted", "production", "true", "LOCAL"]) {
    assert.equal(portalConfig({ ...env, PORTAL_MODE: mode }), null);
    assert.equal(portalConfig({ ...remote, PORTAL_MODE: mode }), null);
  }
  assert.equal(portalConfig({ ...remote, PORTAL_MODE: "local" }), null);
  assert.equal(portalConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: "" }), null);
});
test("draft fields validated and package-only content removed", () => {
  for (const plan of planIds) {
    const d = validateDraft({
      plan,
      contact_name: "Test",
      business_name: "Business",
      products: "Product",
      availability: "Monday",
      services: "Service",
    });
    assert.equal(d.products, plan === "store" ? "Product" : "");
    assert.equal(d.availability, plan === "booking" ? "Monday" : "");
    assert.equal(
      d.services,
      ["business", "booking"].includes(plan) ? "Service" : "",
    );
  }
});
test("reject identity/state injection, unknown plans, oversize, missing identity and malformed content", () => {
  const d = {
    plan: "starter",
    contact_name: "Test",
    business_name: "Business",
  };
  for (const item of [
    { ...d, owner_id: "other" },
    { ...d, status: "paid" },
    { ...d, plan: "free" },
    { ...d, business_name: "" },
    { ...d, contact_name: "a".repeat(121) },
    { ...d, description: {} },
    { ...d, contact_email: "wrong" },
    null,
  ])
    assert.throws(() => validateDraft(item));
});
test("credentials reject malformed email and weak/oversize passwords", () => {
  assert.deepEqual(
    credentials({
      email: " TEST@example.com ",
      password: "long-test-password",
    }),
    { email: "test@example.com", password: "long-test-password" },
  );
  for (const password of ["short", "x".repeat(129)])
    assert.throws(() => credentials({ email: "a@b.test", password }));
  assert.throws(() =>
    credentials({ email: "bad", password: "long-test-password" }),
  );
});
