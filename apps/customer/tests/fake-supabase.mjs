// Stateful Supabase HTTP protocol fixture. NOT an Auth server or JWT verifier.
// Loopback tests only: no real email, credentials, persistence or cloud access.
import http from "node:http";
import { createHash } from "node:crypto";
const drafts = new Map(),
  access = new Map(),
  refresh = new Map(),
  codes = new Map(),
  mail = new Map();
let sequence = 0,
  providerRequests = 0,
  fault = "";
const users = [
  { id: "00000000-0000-0000-0000-000000000001", email: "one@example.test" },
  { id: "00000000-0000-0000-0000-000000000002", email: "two@example.test" },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "unverified@example.test",
  },
].map((u) => ({
  ...u,
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: u.email.startsWith("unverified")
    ? null
    : "2026-11-04T00:00:00Z",
  created_at: "2026-11-04T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  is_anonymous: false,
}));
const userFor = (email) => users.find((u) => u.email === email);
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
function session(u) {
  const serial = ++sequence;
  const token = [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      sub: u.id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      session_id: `fixture-${serial}`,
    }),
    `fixture-signature-${serial}`,
  ].join(".");
  const rt = `fixture-refresh-${serial}`;
  access.set(token, u);
  refresh.set(rt, { user: u, accessToken: token });
  return {
    access_token: token,
    refresh_token: rt,
    expires_in: 3600,
    token_type: "bearer",
    user: u,
  };
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const send = (body, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let data;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    return send({ message: "Invalid JSON" }, 400);
  }
  const url = new URL(req.url, "http://127.0.0.1:55431");
  const bearer = (req.headers.authorization || "").replace(/^Bearer /, "");
  const current = access.get(bearer);
  // Test-only controls are not implemented in or routed through the portal.
  if (url.pathname === "/__fixture") {
    if (data.action === "reset") {
      for (const map of [drafts, access, refresh, codes, mail]) map.clear();
      fault = "";
      providerRequests = 0;
    }
    if (data.action === "revoke") {
      for (const [key, u] of access)
        if (u.email === data.email) access.delete(key);
      for (const [key, entry] of refresh)
        if (entry.user.email === data.email) refresh.delete(key);
    }
    if (data.action === "fault") fault = data.target;
    if (data.action === "mail") return send({ url: mail.get(data.email) });
    if (data.action === "stats") return send({ providerRequests });
    return send({ ok: true });
  }
  providerRequests++;
  if (
    url.pathname === "/auth/v1/signup" ||
    url.pathname === "/auth/v1/recover"
  ) {
    const u = userFor(data.email);
    if (
      url.pathname.endsWith("/signup") &&
      fault === "auto-confirm-logout-failure"
    )
      return send(session(u));
    if (
      u &&
      data.code_challenge &&
      String(data.code_challenge_method).toLowerCase() === "s256"
    ) {
      const code = `fixture-code-${++sequence}`;
      codes.set(code, { u, challenge: data.code_challenge });
      const callback = new URL(url.searchParams.get("redirect_to"));
      callback.searchParams.set("code", code);
      mail.set(data.email, callback.toString());
    }
    return send(
      url.pathname.endsWith("/signup")
        ? { user: u ? { ...u, email_confirmed_at: null } : null, session: null }
        : {},
    );
  }
  if (url.pathname === "/auth/v1/token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "pkce") {
      const entry = codes.get(data.auth_code);
      const challenge = createHash("sha256")
        .update(String(data.code_verifier || ""))
        .digest("base64url");
      if (!entry || entry.challenge !== challenge)
        return send(
          { error: "invalid_grant", message: "Invalid or expired code" },
          400,
        );
      codes.delete(data.auth_code);
      return send(
        session({ ...entry.u, email_confirmed_at: "2026-11-04T00:00:00Z" }),
      );
    }
    if (grant === "refresh_token") {
      const u = refresh.get(data.refresh_token);
      if (!u)
        return send(
          {
            error: "invalid_grant",
            code: "refresh_token_not_found",
            message: "Refresh token revoked",
          },
          400,
        );
      refresh.delete(data.refresh_token);
      return send(session(u.user));
    }
    const u = userFor(data.email);
    if (!u || data.password !== "long-test-password")
      return send({ error: "invalid_grant", message: "Invalid login" }, 400);
    return send(session(u));
  }
  if (url.pathname === "/auth/v1/user") {
    if (fault === "user") return send({ message: "Provider unavailable" }, 503);
    return current
      ? send(current)
      : send({ message: "Invalid session", code: "bad_jwt" }, 401);
  }
  if (url.pathname === "/auth/v1/logout") {
    if (fault === "logout" || fault === "auto-confirm-logout-failure")
      return send({ message: "Signout service unavailable" }, 503);
    for (const [key, entry] of refresh)
      if (
        url.searchParams.get("scope") === "local"
          ? entry.accessToken === bearer
          : entry.user.id === current?.id
      )
        refresh.delete(key);
    // Auth may leave issued JWTs valid until expiry; do not pretend to revoke them here.
    res.statusCode = 204;
    return res.end();
  }
  if (url.pathname === "/rest/v1/onboarding_drafts") {
    if (!current || !current.email_confirmed_at)
      return send({ message: "Denied" }, 401);
    if (fault === "database")
      return send({ code: "08006", message: "Database unavailable" }, 503);
    if (
      url.searchParams.get("owner_id") &&
      url.searchParams.get("owner_id") !== `eq.${current.id}`
    )
      return send({ message: "Denied" }, 403);
    const saved = drafts.get(current.id);
    if (req.method === "GET") return send(saved || null);
    if (req.method === "POST" && data.owner_id !== current.id)
      return send({ message: "Denied" }, 403);
    if (req.method === "POST" && saved)
      return send({ code: "23505", message: "Duplicate draft" }, 409);
    if (
      req.method === "PATCH" &&
      (!saved || url.searchParams.get("revision") !== `eq.${saved.revision}`)
    )
      return send([]);
    const revision = (saved?.revision ?? 0) + 1;
    drafts.set(current.id, {
      plan: data.plan,
      content: data.content,
      updated_at: new Date().toISOString(),
      revision,
    });
    return send(
      req.method === "PATCH" ? [{ revision }] : { revision },
      req.method === "POST" ? 201 : 200,
    );
  }
  send({ message: "Not found" }, 404);
});
server.listen(55431, "127.0.0.1");
