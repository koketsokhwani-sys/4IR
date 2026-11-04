import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { portalConfig } from "../lib/config.ts";
import { requestAllowed } from "../lib/gate.ts";
const password = "synthetic-pilot-access-for-tests-only-12345";
const env = {
  PORTAL_MODE: "render-pilot", PORTAL_PILOT_ENABLED: "true",
  PORTAL_ORIGIN: "https://4ir-pilot-test.onrender.com",
  SUPABASE_URL: "https://qcxtcwvibgizqynkjtja.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_key_only_12345",
  PORTAL_PILOT_ACCESS_SHA256: createHash("sha256").update(password).digest("hex"),
  PORTAL_PILOT_USER_IDS: "00000000-0000-0000-0000-000000000001",
};
test("Render pilot requires every gate and exactly the dedicated backend", () => {
  assert.equal(portalConfig(env)?.secureCookies, true);
  for (const key of Object.keys(env)) assert.equal(portalConfig({ ...env, [key]: "" }), null, key);
  for (const url of ["http://4ir-pilot-test.onrender.com", "https://munchies.onrender.com", "https://4ir-pilot-test.onrender.com.evil.test", "https://4ir-pilot-test.onrender.com/path", "https://user@4ir-pilot-test.onrender.com", "https://4ir-pilot-test.onrender.com:8443"])
    assert.equal(portalConfig({ ...env, PORTAL_ORIGIN: url }), null);
  for (const url of ["https://other.supabase.co", env.SUPABASE_URL + "/", env.SUPABASE_URL + ".evil.test"])
    assert.equal(portalConfig({ ...env, SUPABASE_URL: url }), null);
  for (const key of ["sb_secret_synthetic_test_key_only_12345", "eyJhbGciOiJIUzI1NiJ9.synthetic.jwt", "sb_publishable_short"])
    assert.equal(portalConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: key }), null);
  for (const ids of ["", "any", env.PORTAL_PILOT_USER_IDS + ",", Array(11).fill(env.PORTAL_PILOT_USER_IDS).join(",")])
    assert.equal(portalConfig({ ...env, PORTAL_PILOT_USER_IDS: ids }), null);
  assert.equal(portalConfig({ PORTAL_MODE: "local", RENDER: "true", PORTAL_ORIGIN:"http://localhost", SUPABASE_URL:"http://localhost", SUPABASE_PUBLISHABLE_KEY:"fake" }), null);
});
test("pilot requires exact Host plus bounded Basic credential; forwarded headers grant nothing", () => {
  const config = portalConfig(env);
  const headers = new Headers({ host: "4ir-pilot-test.onrender.com", authorization: "Basic " + Buffer.from("4ir-pilot:" + password).toString("base64") });
  assert.equal(requestAllowed(headers, config), true);
  for (const value of ["", "Bearer anything", "Basic !!!!", "Basic " + Buffer.from("wrong:" + password).toString("base64"), "Basic " + Buffer.from("4ir-pilot:" + password + "x").toString("base64")]) {
    const bad = new Headers(headers); bad.set("authorization", value);
    assert.equal(requestAllowed(bad, config), false);
  }
  headers.set("host", "evil.example.test");
  headers.set("x-forwarded-host", "4ir-pilot-test.onrender.com");
  assert.equal(requestAllowed(headers, config), false);
});
