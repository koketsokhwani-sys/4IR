// Deterministic transport fixture, not an authentication service. Loopback only.
// Never import from application code or deploy. No real email or passwords stored.
import http from "node:http";
const drafts = new Map();
const users = {
  one: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "one@example.test",
  },
  two: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "two@example.test",
  },
};
const user = (base, confirmed = true) => ({
  ...base,
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: confirmed ? "2026-11-04T00:00:00Z" : null,
  created_at: "2026-11-04T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  is_anonymous: false,
});
const token = (u) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: u.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
      }),
    ).toString("base64url"),
    "fixture-signature",
  ].join(".");
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const send = (body, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let data = {};
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    return send({ error: "invalid" }, 400);
  }
  const url = new URL(req.url, "http://127.0.0.1:55431");
  let uid;
  try {
    uid = JSON.parse(
      Buffer.from(
        (req.headers.authorization || "").split(".")[1] || "",
        "base64url",
      ).toString(),
    ).sub;
  } catch {}
  const current = Object.values(users).find((u) => u.id === uid);
  if (url.pathname === "/auth/v1/signup")
    return send({ user: user(users.one, false), session: null });
  if (url.pathname === "/auth/v1/recover") return send({});
  if (url.pathname === "/auth/v1/token") {
    if (url.searchParams.get("grant_type") === "pkce")
      return send(
        { error: "invalid_grant", message: "Expired fixture code" },
        400,
      );
    if (data.password !== "long-test-password")
      return send({ error: "invalid_grant", message: "Invalid login" }, 400);
    const u = user(
      data.email === "two@example.test" ? users.two : users.one,
      data.email !== "unverified@example.test",
    );
    return send({
      access_token: token(u),
      refresh_token: "fixture-refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: u,
    });
  }
  if (url.pathname === "/auth/v1/user")
    return current
      ? send(user(current))
      : send({ message: "Invalid session" }, 401);
  if (url.pathname === "/auth/v1/logout") {
    res.statusCode = 204;
    return res.end();
  }
  if (url.pathname === "/rest/v1/onboarding_drafts") {
    if (!current) return send({ message: "Denied" }, 401);
    if (req.method === "GET") return send(drafts.get(uid) || null);
    if (data.owner_id !== uid) return send({ message: "Denied" }, 403);
    drafts.set(uid, {
      plan: data.plan,
      content: data.content,
      updated_at: new Date().toISOString(),
    });
    res.statusCode = 201;
    return res.end();
  }
  send({ message: "Not found" }, 404);
});
server.listen(55431, "127.0.0.1");
