// Production-built Node app behind a temporary loopback TLS terminator.
// No real Render/Supabase request, key, account or email is used.
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
// The actual pilot host is an inert fixture: HTTPS sockets connect only to loopback.
const hostname = "fourir-customer-pilot.onrender.com";
const origin = "https://" + hostname;
const password = "synthetic-pilot-access-for-tests-only-12345";
const authorization = "Basic " + Buffer.from("4ir-pilot:" + password).toString("base64");
const temp = mkdtempSync(join(tmpdir(), "4ir-pilot-tls-"));
const children = [];
let proxy;
async function waitFor(url) {
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Local test server did not start.");
}
function launch(args, env = {}) {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", b => { stderr = (stderr + b).slice(-4000); });
  child.on("exit", code => { if (code && code !== 143) process.stderr.write(stderr); });
  children.push(child);
  return child;
}
try {
  // Ephemeral self-signed test certificate, trusted only by this test client.
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=" + hostname, "-addext", "subjectAltName=DNS:" + hostname, "-keyout", join(temp, "key.pem"), "-out", join(temp, "cert.pem")], { stdio: "ignore" });
  const ca = readFileSync(join(temp, "cert.pem"));
  launch(["tests/fake-supabase.mjs"]);
  await waitFor("http://127.0.0.1:55431/__fixture");
  launch(["--import", "./tests/pilot-provider.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3104"], {
    PORTAL_PILOT_TEST: "synthetic-local-only", PORTAL_MODE: "render-pilot", PORTAL_PILOT_ENABLED: "true", RENDER: "true",
    PORTAL_ORIGIN: origin, SUPABASE_URL: "https://qcxtcwvibgizqynkjtja.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_key_only_12345",
    PORTAL_PILOT_ACCESS_SHA256: createHash("sha256").update(password).digest("hex"),
    PORTAL_PILOT_USER_IDS: "00000000-0000-0000-0000-000000000001",
  });
  await waitFor("http://127.0.0.1:3104/healthz");
  proxy = https.createServer({ key: readFileSync(join(temp, "key.pem")), cert: ca }, (req, res) => {
    const upstream = http.request({ hostname: "127.0.0.1", port: 3104, path: req.url, method: req.method, headers: { ...req.headers, "x-forwarded-proto": "https" } }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on("error", () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(0, "127.0.0.1", resolve));
  const request = (path, { data, cookie, auth = authorization, host = hostname, headers = {} } = {}) => new Promise((resolve, reject) => {
    const body = data === undefined ? undefined : JSON.stringify(data);
    const req = https.request({ hostname: "127.0.0.1", port: proxy.address().port, servername: hostname, ca, path,
      method: body === undefined ? "GET" : "POST", headers: { Host: host, Origin: origin, ...(auth ? { Authorization: auth } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}), ...headers } }, res => {
      let text = ""; res.on("data", b => { text += b; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
    }); req.on("error", reject); req.end(body);
  });
  const control = async data => (await fetch("http://127.0.0.1:55431/__fixture", { method: "POST", body: JSON.stringify(data) })).json();
  const cookies = response => (response.headers["set-cookie"] ?? []).map(c => c.split(";")[0]).join("; ");
  const privateResponse = response => { assert.match(response.headers["cache-control"], /private/); assert.match(response.headers["cache-control"], /no-store/); };
  const secureCookies = response => {
    assert.ok(response.headers["set-cookie"]?.length);
    for (const value of response.headers["set-cookie"]) {
      assert.match(value, /; Secure/i); assert.match(value, /; HttpOnly/i); assert.match(value, /SameSite=Lax/i); assert.doesNotMatch(value, /Domain=/i);
    }
  };
  await control({ action: "reset" });
  for (const path of ["/", "/account", "/onboarding", "/api/draft", "/auth/callback?code=fake"]) {
    const blocked = await request(path, { auth: "" }); assert.equal(blocked.status, 401); privateResponse(blocked);
    assert.equal(blocked.headers["set-cookie"], undefined);
  }
  assert.equal((await request("/api/signin", { auth: "Basic invalid", data: {} })).status, 401);
  assert.equal((await request("/api/draft", { auth: "", headers: { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" } })).status, 401);
  for (const host of ["evil.example.test", "fourir-other.onrender.com", "fourir-customer-pilot-evil.onrender.com", hostname + ".evil.test", hostname + ".", hostname + ":8443", "4ir-pilot-test.onrender.com"]) {
    assert.equal((await request("/api/draft", { host, headers: { "x-forwarded-host": hostname, "x-forwarded-proto": "https" } })).status, 403, host);
  }
  for (const badOrigin of ["http://" + hostname, "ftp://" + hostname, origin + ".evil.test", "https://fourir-other.onrender.com"]) {
    assert.equal((await request("/api/signin", { data: {}, headers: { Origin: badOrigin } })).status, 403, badOrigin);
  }
  assert.equal((await request("/api/project")).status, 403);
  assert.equal((await request("/api/project", { data: {} })).status, 403);
  for (const action of ["register", "recover", "password"]) assert.equal((await request("/api/" + action, { data: { email: "one@example.test", password: "long-test-password" } })).status, 403);
  assert.equal((await request("/auth/callback?code=fake")).status, 403);
  assert.deepEqual(await control({ action: "stats" }), { providerRequests: 0 });
  const page = await request("/account?mode=register");
  assert.equal(page.status, 200); assert.match(page.text, /Welcome back/); assert.doesNotMatch(page.text, /Create test account|Forgot password\?/);
  assert.equal((await request("/healthz", { auth: "" })).status, 204);
  console.log("Pilot perimeter, email/signup denial, closed UI and forged-host checks passed without provider calls.");

  const denied = await request("/api/signin", { data: { email: "two@example.test", password: "long-test-password" } });
  assert.equal(denied.status, 401); secureCookies(denied);
  assert.ok(denied.headers["set-cookie"].some(c => /Max-Age=0/i.test(c)));
  const signed = await request("/api/signin", { data: { email: "one@example.test", password: "long-test-password" } });
  assert.equal(signed.status, 200); privateResponse(signed); secureCookies(signed);
  let cookie = cookies(signed);
  // Even an allowlisted, authenticated customer behind the shared gate has no
  // payment capability. Rejections must not call Auth/database or redirect.
  const beforePayment = await control({ action: "stats" });
  for (const action of ["checkout", "payment", "subscribe"]) {
    const deniedPayment = await request("/api/" + action, { cookie, data: {} });
    assert.equal(deniedPayment.status, 403); privateResponse(deniedPayment);
    assert.equal(deniedPayment.headers.location, undefined);
    assert.equal(deniedPayment.headers["set-cookie"], undefined);
    const missingPayment = await request("/api/" + action, { cookie });
    assert.equal(missingPayment.status, 404); privateResponse(missingPayment);
    assert.equal(missingPayment.headers.location, undefined);
    assert.equal(missingPayment.headers["set-cookie"], undefined);
  }
  assert.deepEqual(await control({ action: "stats" }), beforePayment);
  console.log("Authenticated pilot payment actions denied without provider calls or redirects.");
  const draft = await request("/api/draft", { cookie }); assert.equal(draft.status, 200); privateResponse(draft);
  const state = JSON.parse(draft.text);
  const saved = await request("/api/draft", { cookie, data: { expected_account_id: state.account_id, expected_revision: 0, plan: "starter", contact_name: "Synthetic Test", business_name: "Pilot test only" } });
  assert.equal(saved.status, 200); privateResponse(saved);
  assert.equal((await request("/api/draft", { cookie, auth: "" })).status, 401);
  assert.equal((await request("/api/draft", { cookie, data: {}, headers: { Origin: "https://evil.example.test" } })).status, 403);
  const encoded = cookie.split("=").slice(1).join("=").replace(/^base64-/, "");
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString());
  session.expires_at = 1;
  cookie = "4ir-auth=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const refreshed = await request("/api/draft", { cookie }); assert.equal(refreshed.status, 200); privateResponse(refreshed); secureCookies(refreshed);
  cookie = cookies(refreshed);
  const logout = await request("/api/signout", { cookie, data: {} }); assert.equal(logout.status, 200); privateResponse(logout); secureCookies(logout);
  assert.ok(logout.headers["set-cookie"].some(c => /Max-Age=0/i.test(c)));
  assert.equal((await request("/api/draft")).status, 401);
  console.log("Pilot allowed-user draft lifecycle, Secure session refresh/deletion and non-allowlisted-user rejection passed over local TLS.");
} finally {
  if (proxy) { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  for (const child of children.reverse()) {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([new Promise(resolve => child.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 2000))]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  }
  rmSync(temp, { recursive: true, force: true });
}
