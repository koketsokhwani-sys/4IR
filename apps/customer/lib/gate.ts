import { createHash, timingSafeEqual } from "node:crypto";
import { portalConfig } from "./config.ts";
type Config = NonNullable<ReturnType<typeof portalConfig>>;

export function requestAllowed(headers: Headers, config: Config | null) {
  if (!config || headers.get("host") !== new URL(config.origin).host) return false;
  if (config.mode === "local") return true;
  const authorization = headers.get("authorization") ?? "";
  if (!/^Basic [A-Za-z0-9+/]+={0,2}$/.test(authorization) || authorization.length > 1024) return false;
  const encoded = authorization.slice(6);
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.toString("base64") !== encoded) return false;
  const credential = decoded.toString("utf8");
  const prefix = "4ir-pilot:";
  if (!credential.startsWith(prefix)) return false;
  const password = credential.slice(prefix.length);
  if (password.length < 32 || password.length > 256) return false;
  return timingSafeEqual(createHash("sha256").update(password).digest(), Buffer.from(config.accessHash, "hex"));
}

// The allowlist restricts the application pilot, not direct Supabase access.
// Hosted Auth signup must remain disabled and RLS still protects customer data.
export function pilotUserAllowed(id: string) {
  const config = portalConfig();
  return !!config && (config.mode === "local" || config.userIds.includes(id));
}
